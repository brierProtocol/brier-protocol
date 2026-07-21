import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ethers } from 'ethers';

import { DEPOSIT_RPC_URL as RPC_URL, USDC_ADDRESS_ENV, USDC_DECIMALS } from '@/constants/contracts';

// Misma cadena/RPC y token que los depositos.
const USDC_ADDRESS = USDC_ADDRESS_ENV?.toLowerCase();
const WITHDRAW_EVENT_SIG = ethers.id('Withdraw(address,address,address,uint256,uint256)');

/**
 * POST /api/withdraw
 * Registra la salida de un LP. El retiro en sí ocurre on-chain (ERC-4626
 * withdraw/redeem); este endpoint verifica el txHash y actualiza la BD.
 * Body: { botId, depositorWallet, txHash }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, txHash } = body;
    // Normalizar a minúsculas: el updateMany de VaultDeposit filtra por wallet exacta
    // y los depósitos se guardan lowercased, así que sin esto el casing distinto
    // dejaría deposits activos con la posición ya cerrada (WARN-2).
    const depositorWallet = String(body?.depositorWallet ?? '').toLowerCase();

    if (!botId || !depositorWallet || !txHash) {
      return NextResponse.json(
        { error: 'Missing required parameters (botId, depositorWallet, txHash)' },
        { status: 400 }
      );
    }

    // Shape check + anti-replay (F1): reject a withdrawal txHash already booked, so a
    // resubmit can't decrement TVL/shares twice. Reuses VaultDeposit.txHash @unique.
    const normalizedTxHash = String(txHash).toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(normalizedTxHash)) {
      return NextResponse.json({ error: 'Invalid transaction hash format' }, { status: 400 });
    }
    const alreadyProcessed = await prisma.vaultDeposit.findUnique({
      where: { txHash: normalizedTxHash },
      select: { id: true },
    });
    if (alreadyProcessed) {
      return NextResponse.json({ error: 'This withdrawal has already been processed' }, { status: 409 });
    }

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || !bot.vaultAddress) {
      return NextResponse.json({ error: 'Bot or Vault Address not found' }, { status: 404 });
    }

    // Verificar el retiro on-chain: un Transfer de USDC DESDE el vault HACIA el LP.
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(normalizedTxHash);
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json(
        { error: 'Transaction failed or not found on-chain' },
        { status: 400 }
      );
    }

    let withdrawnAmount = 0;
    let sharesBurned = 0;
    for (const log of receipt.logs) {
      if (log.topics[0] !== WITHDRAW_EVENT_SIG) continue;
      if (log.address.toLowerCase() !== bot.vaultAddress.toLowerCase()) continue;

      const ownerHex = log.topics[3];
      if (!ownerHex) continue;

      const owner = ethers.getAddress(ethers.dataSlice(ownerHex, 12));
      if (owner.toLowerCase() === depositorWallet.toLowerCase()) {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data);
        withdrawnAmount = Number(ethers.formatUnits(decoded[0], USDC_DECIMALS));
        sharesBurned = Number(ethers.formatUnits(decoded[1], USDC_DECIMALS));
        break;
      }
    }

    if (withdrawnAmount <= 0 || sharesBurned <= 0) {
      return NextResponse.json(
        { error: 'No valid ERC4626 Withdraw from the Vault for this wallet found' },
        { status: 400 }
      );
    }

    const position = await prisma.vaultPosition.findFirst({
      where: { botId, userWallet: { equals: depositorWallet, mode: 'insensitive' } },
    });
    const currentShares = position?.shares ?? 0;
    const currentCostBasis = position?.costBasisUsdc ?? 0;
    
    // Proportional cost basis reduction for partial withdrawals
    const proportionBurned = currentShares > 0 ? Math.min(1, sharesBurned / currentShares) : 0;
    const costBasisReduced = currentCostBasis * proportionBurned;
    const realizedDelta = withdrawnAmount - costBasisReduced;
    const newShares = Math.max(0, currentShares - sharesBurned);
    const newCostBasis = Math.max(0, currentCostBasis - costBasisReduced);

    const exitReason = bot.vaultClosedAt ? (bot.vaultCloseReason || 'VAULT_CLOSED') : 'MANUAL';

    // FIFO Partial Withdrawal Logic
    const activeDeposits = await prisma.vaultDeposit.findMany({
      where: { botId, depositorWallet, active: true, kind: 'DEPOSIT' },
      orderBy: { depositedAt: 'asc' },
    });

    let remainingSharesToBurn = sharesBurned;
    const depositUpdates = [];

    for (const dep of activeDeposits) {
      if (remainingSharesToBurn <= 0) break;
      if (dep.shares <= remainingSharesToBurn) {
        remainingSharesToBurn -= dep.shares;
        depositUpdates.push(
          prisma.vaultDeposit.update({
            where: { id: dep.id },
            data: { active: false, shares: 0, exitedAt: new Date(), exitReason }
          })
        );
      } else {
        depositUpdates.push(
          prisma.vaultDeposit.update({
            where: { id: dep.id },
            data: { shares: dep.shares - remainingSharesToBurn }
          })
        );
        remainingSharesToBurn = 0;
      }
    }

    try {
      await prisma.$transaction([
        prisma.vaultDeposit.create({
          data: {
            botId,
            txHash: normalizedTxHash,
            depositorWallet,
            amountUsdc: withdrawnAmount,
            shares: sharesBurned,
            kind: 'REDEEM',
            active: false,
            exitedAt: new Date(),
            exitReason,
          },
        }),
        ...depositUpdates,
        prisma.bot.update({
          where: { id: botId },
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
                  shares: newShares,
                  costBasisUsdc: newCostBasis,
                  realizedPnlUsdc: { increment: realizedDelta },
                },
              }),
            ]
          : []),
      ]);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'This withdrawal has already been processed' }, { status: 409 });
      }
      throw e;
    }

    return NextResponse.json({ success: true, withdrawnAmount });
  } catch (error: any) {
    console.error('Withdraw API Error:', error);
    return NextResponse.json({ error: 'Failed to record withdrawal' }, { status: 500 });
  }
}
