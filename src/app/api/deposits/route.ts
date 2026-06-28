import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ethers } from 'ethers';
import { notifyDeposit } from '@/lib/notifications';
import { DEPOSIT_RPC_URL as RPC_URL, USDC_ADDRESS_ENV, USDC_DECIMALS } from '@/constants/contracts';
import { depositBlockReason } from '@/lib/vault-lifecycle';

// Direccion del contrato USDC esperado. Si se define (USDC_ADDRESS_ENV), SOLO se aceptan
// transferencias de ese token (evita depositar un ERC20 falso e inflar el TVL).
// undefined => validacion de token deshabilitada.
const USDC_ADDRESS = USDC_ADDRESS_ENV?.toLowerCase();

// ERC20 Transfer Event Signature
const TRANSFER_EVENT_SIG = ethers.id('Transfer(address,address,uint256)');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, depositorWallet, txHash, mode } = body;

    if (!botId || !depositorWallet || !txHash) {
      return NextResponse.json(
        { error: 'Missing required parameters (txHash, botId, depositorWallet)' },
        { status: 400 }
      );
    }

    // SECURITY [anti-replay]: rechazar si este txHash ya fue procesado.
    // (Antes había código muerto que NUNCA deduplicaba y ni guardaba el txHash.)
    const alreadyProcessed = await prisma.vaultDeposit.findUnique({
      where: { txHash },
      select: { id: true },
    });
    if (alreadyProcessed) {
      return NextResponse.json(
        { error: 'This transaction has already been recorded' },
        { status: 409 }
      );
    }

    // 1. Buscar el bot para obtener su vaultAddress
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || !bot.vaultAddress) {
      return NextResponse.json({ error: 'Bot or Vault Address not found' }, { status: 404 });
    }

    // 2. Verificar el txHash on-chain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json(
        { error: 'Transaction failed or not found on-chain' },
        { status: 400 }
      );
    }

    // 3. Decodificar el evento Transfer para hallar el monto exacto depositado
    let realAmountUsdc = 0;
    let verifiedSender = '';

    for (const log of receipt.logs) {
      if (log.topics[0] !== TRANSFER_EVENT_SIG) continue;

      // SECURITY [token-spoofing]: si hay USDC configurado, exigir que el Transfer
      // provenga exactamente del contrato USDC, no de un ERC20 cualquiera.
      if (USDC_ADDRESS && log.address.toLowerCase() !== USDC_ADDRESS) continue;

      const fromAddressHex = log.topics[1];
      const toAddressHex = log.topics[2];
      if (!toAddressHex || !fromAddressHex) continue;

      const toAddress = ethers.getAddress(ethers.dataSlice(toAddressHex, 12));
      const fromAddress = ethers.getAddress(ethers.dataSlice(fromAddressHex, 12));

      if (toAddress.toLowerCase() === bot.vaultAddress.toLowerCase()) {
        // formatUnits usa BigInt internamente => sin pérdida de precisión por Number.
        realAmountUsdc = Number(ethers.formatUnits(ethers.toBigInt(log.data), USDC_DECIMALS));
        verifiedSender = fromAddress;
        break;
      }
    }

    if (!USDC_ADDRESS) {
      console.warn(
        '[deposits] NEXT_PUBLIC_USDC_ADDRESS no está configurada: validación de token deshabilitada.'
      );
    }

    if (realAmountUsdc <= 0) {
      return NextResponse.json(
        { error: 'No valid USDC Transfer to the Vault found in this transaction' },
        { status: 400 }
      );
    }

    // SECURITY: el depositante declarado debe coincidir con el sender real on-chain
    if (verifiedSender && depositorWallet.toLowerCase() !== verifiedSender.toLowerCase()) {
      return NextResponse.json(
        { error: 'Depositor wallet does not match the on-chain sender' },
        { status: 403 }
      );
    }

    // LIFECYCLE + CAPACITY: un vault cerrado (black swan) o lleno no acepta depósitos.
    // Sobre-llenar diluye a los que ya entraron; un vault cerrado solo permite claim.
    const blocked = depositBlockReason(bot);
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 409 });
    }

    // SHARES (ERC-4626 mirror): se mintean al NAV vigente ANTES de este depósito.
    // navPerShare = currentTVL / totalShares. En génesis (totalShares == 0) el
    // primer depositante entra 1:1. La ganancia/pérdida posterior se refleja en el
    // NAV, no en el número de shares: cada share vale más (o menos) USDC con el tiempo.
    const navPerShare = bot.totalShares > 0 ? bot.currentTVL / bot.totalShares : 1;
    const sharesMinted = realAmountUsdc / navPerShare;
    const riskMode = mode || 'CONSERVATIVE';

    // Identidad del inversor (cero-fricción: wallet = user). Aseguramos que exista
    // el User antes de crear la posición, que sí tiene FK a User.
    await prisma.user.upsert({
      where: { walletAddress: depositorWallet },
      update: {},
      create: { walletAddress: depositorWallet },
    });

    // 4. Guardar el depósito (con txHash para el anti-replay).
    let deposit;
    try {
      deposit = await prisma.vaultDeposit.create({
        data: {
          botId,
          depositorWallet,
          amountUsdc: realAmountUsdc,
          shares: sharesMinted,
          kind: 'DEPOSIT',
          txHash,
          mode: riskMode,
          active: true,
          totalProfitEarned: 0,
        },
      });
    } catch (e: any) {
      // P2002 = violación de índice único (txHash) por carrera concurrente.
      if (e?.code === 'P2002') {
        return NextResponse.json(
          { error: 'This transaction has already been recorded' },
          { status: 409 }
        );
      }
      throw e;
    }

    // 5. Subir TVL + shares del bot y consolidar la posición agregada del inversor.
    await prisma.$transaction([
      prisma.bot.update({
        where: { id: botId },
        data: {
          currentTVL: { increment: realAmountUsdc },
          totalShares: { increment: sharesMinted },
        },
      }),
      prisma.vaultPosition.upsert({
        where: { userWallet_botId: { userWallet: depositorWallet, botId } },
        update: {
          shares: { increment: sharesMinted },
          costBasisUsdc: { increment: realAmountUsdc },
          mode: riskMode,
        },
        create: {
          userWallet: depositorWallet,
          botId,
          shares: sharesMinted,
          costBasisUsdc: realAmountUsdc,
          mode: riskMode,
        },
      }),
    ]);

    // Notificar al creador
    if (bot.walletAddress) {
      await notifyDeposit(bot.walletAddress, depositorWallet, bot.name, realAmountUsdc);
    }

    return NextResponse.json({ success: true, deposit, realAmount: realAmountUsdc });
  } catch (error: any) {
    console.error('Create Deposit API Error:', error);
    return NextResponse.json({ error: 'Failed to record deposit' }, { status: 500 });
  }
}
