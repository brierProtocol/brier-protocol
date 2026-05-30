import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { notifyDeposit } from '@/lib/notifications';

const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "http://127.0.0.1:8545";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, depositorWallet, amountUsdc, mode, txHash } = body;

    if (!botId || !depositorWallet || !amountUsdc || !txHash) {
      return NextResponse.json({ error: 'Missing required parameters (including txHash)' }, { status: 400 });
    }

    // 1. Fetch the bot from Prisma to get its vaultAddress
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || !bot.vaultAddress) {
      return NextResponse.json({ error: 'Bot or Vault Address not found' }, { status: 404 });
    }

    // 2. Query the Blockchain to verify the txHash
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    const tx = await provider.getTransaction(txHash);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction failed or not found on-chain' }, { status: 400 });
    }

    // Ensure the transaction 'to' address is actually the vault
    if (tx && tx.to && tx.to.toLowerCase() !== bot.vaultAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Transaction target does not match Vault address' }, { status: 400 });
    }

    const deposit = await prisma.vaultDeposit.create({
      data: {
        botId,
        depositorWallet,
        amountUsdc: parseFloat(amountUsdc),
        mode: mode || 'CONSERVATIVE',
        active: true,
        totalProfitEarned: 0
      }
    });

    // Increment bot TVL in Prisma
    await prisma.bot.update({
      where: { id: botId },
      data: {
        currentTVL: {
          increment: parseFloat(amountUsdc)
        }
      }
    });

    // Dispatch notification to the builder
    if (bot.walletAddress) {
      await notifyDeposit(bot.walletAddress, depositorWallet, bot.name, parseFloat(amountUsdc));
    }

    return NextResponse.json({ success: true, deposit });
  } catch (error: any) {
    console.error('Create Deposit API Error:', error);
    return NextResponse.json({ error: 'Failed to record deposit' }, { status: 500 });
  }
}
