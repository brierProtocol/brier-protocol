import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ethers } from 'ethers';

import { DEPOSIT_RPC_URL as RPC_URL, USDC_ADDRESS_ENV, USDC_DECIMALS } from '@/constants/contracts';

// Misma cadena/RPC y token que los depositos.
const USDC_ADDRESS = USDC_ADDRESS_ENV?.toLowerCase();
const TRANSFER_EVENT_SIG = ethers.id('Transfer(address,address,uint256)');

/**
 * POST /api/withdraw
 * Registra la salida de un LP. El retiro en sí ocurre on-chain (ERC-4626
 * withdraw/redeem); este endpoint verifica el txHash y actualiza la BD.
 * Body: { botId, depositorWallet, txHash }
 */
export async function POST(request: NextRequest) {
  try {
    const { botId, depositorWallet, txHash } = await request.json();

    if (!botId || !depositorWallet || !txHash) {
      return NextResponse.json(
        { error: 'Missing required parameters (botId, depositorWallet, txHash)' },
        { status: 400 }
      );
    }

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || !bot.vaultAddress) {
      return NextResponse.json({ error: 'Bot or Vault Address not found' }, { status: 404 });
    }

    // Verificar el retiro on-chain: un Transfer de USDC DESDE el vault HACIA el LP.
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json(
        { error: 'Transaction failed or not found on-chain' },
        { status: 400 }
      );
    }

    let withdrawnAmount = 0;
    for (const log of receipt.logs) {
      if (log.topics[0] !== TRANSFER_EVENT_SIG) continue;
      if (USDC_ADDRESS && log.address.toLowerCase() !== USDC_ADDRESS) continue;

      const fromHex = log.topics[1];
      const toHex = log.topics[2];
      if (!fromHex || !toHex) continue;

      const from = ethers.getAddress(ethers.dataSlice(fromHex, 12));
      const to = ethers.getAddress(ethers.dataSlice(toHex, 12));

      if (
        from.toLowerCase() === bot.vaultAddress.toLowerCase() &&
        to.toLowerCase() === depositorWallet.toLowerCase()
      ) {
        withdrawnAmount = Number(ethers.formatUnits(ethers.toBigInt(log.data), USDC_DECIMALS));
        break;
      }
    }

    if (withdrawnAmount <= 0) {
      return NextResponse.json(
        { error: 'No valid USDC withdrawal from the Vault to this wallet found' },
        { status: 400 }
      );
    }

    // Posición agregada del inversor (case-insensitive: el depósito pudo guardar la
    // wallet con otro case). MVP = salida total, así que se queman TODAS sus shares.
    const position = await prisma.vaultPosition.findFirst({
      where: { botId, userWallet: { equals: depositorWallet, mode: 'insensitive' } },
    });
    const sharesBurned = position?.shares ?? 0;
    // PnL realizado en salida total = lo que recibió on-chain menos su cost basis.
    const realizedDelta = withdrawnAmount - (position?.costBasisUsdc ?? 0);

    // Actualizar estado: marcar los depósitos del LP como retirados, bajar el TVL,
    // quemar las shares del bot y cerrar la posición agregada (realizando el PnL).
    // MVP = salida total. TODO: soportar retiros parciales reduciendo shares (FIFO).
    await prisma.$transaction([
      prisma.vaultDeposit.updateMany({
        where: { botId, depositorWallet, active: true },
        data: { active: false, exitedAt: new Date(), exitReason: 'MANUAL' },
      }),
      prisma.bot.update({
        where: { id: botId },
        // Evita TVL/shares negativos si hubo ganancias contabilizadas aparte.
        data: {
          currentTVL: { decrement: Math.min(withdrawnAmount, bot.currentTVL) },
          totalShares: { decrement: Math.min(sharesBurned, bot.totalShares) },
        },
      }),
      ...(position
        ? [
            prisma.vaultPosition.update({
              where: { id: position.id },
              data: {
                shares: 0,
                costBasisUsdc: 0,
                realizedPnlUsdc: { increment: realizedDelta },
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, withdrawnAmount });
  } catch (error: any) {
    console.error('Withdraw API Error:', error);
    return NextResponse.json({ error: 'Failed to record withdrawal' }, { status: 500 });
  }
}
