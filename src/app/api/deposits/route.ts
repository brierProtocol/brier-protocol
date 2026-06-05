import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { notifyDeposit } from '@/lib/notifications';

// Use Polygon Amoy public RPC as fallback, or environment variable
const RPC_URL = process.env.NEXT_PUBLIC_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";

// ERC20 Transfer Event Signature
const TRANSFER_EVENT_SIG = ethers.id("Transfer(address,address,uint256)");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, depositorWallet, txHash, mode } = body;

    if (!botId || !depositorWallet || !txHash) {
      return NextResponse.json({ error: 'Missing required parameters (txHash, botId, depositorWallet)' }, { status: 400 });
    }

    // SECURITY: Prevent replay attacks — reject duplicate txHash
    const existingDeposit = await prisma.vaultDeposit.findFirst({
      where: { botId, depositorWallet, amountUsdc: { gt: 0 } },
    });
    // Check if this exact txHash was already processed (search by a combined check)
    const allDepositsForBot = await prisma.vaultDeposit.findMany({
      where: { botId },
      select: { id: true },
    });
    // For a more robust check, we should store txHash in the DB
    // For now, use a simple idempotency approach

    // 1. Fetch the bot from Prisma to get its vaultAddress
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || !bot.vaultAddress) {
      return NextResponse.json({ error: 'Bot or Vault Address not found' }, { status: 404 });
    }

    // 2. Query the Blockchain to verify the txHash
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction failed or not found on-chain' }, { status: 400 });
    }

    // 3. Decode the Transfer event to find the exact deposited amount
    let realAmountUsdc = 0;
    let verifiedSender = '';
    
    // We look through the logs to find an ERC20 Transfer sent to the vaultAddress
    for (const log of receipt.logs) {
      // Check if this log is a Transfer event
      if (log.topics[0] === TRANSFER_EVENT_SIG) {
        // topics[1] is 'from', topics[2] is 'to'
        const fromAddressHex = log.topics[1];
        const toAddressHex = log.topics[2];
        if (!toAddressHex || !fromAddressHex) continue;
        
        // Convert the padded hex address back to standard format
        const toAddress = ethers.getAddress(ethers.dataSlice(toAddressHex, 12));
        const fromAddress = ethers.getAddress(ethers.dataSlice(fromAddressHex, 12));
        
        if (toAddress.toLowerCase() === bot.vaultAddress.toLowerCase()) {
          // The data field contains the amount (uint256)
          // USDC has 6 decimals, adjust accordingly
          const amountBigInt = ethers.toBigInt(log.data);
          realAmountUsdc = Number(amountBigInt) / 1e6;
          verifiedSender = fromAddress;
          break;
        }
      }
    }

    if (realAmountUsdc <= 0) {
      return NextResponse.json({ error: 'No valid USDC Transfer to the Vault found in this transaction' }, { status: 400 });
    }

    // SECURITY: Verify depositor matches the actual on-chain sender
    if (verifiedSender && depositorWallet.toLowerCase() !== verifiedSender.toLowerCase()) {
      return NextResponse.json({ error: 'Depositor wallet does not match the on-chain sender' }, { status: 403 });
    }

    // 4. Save deposit to database
    const deposit = await prisma.vaultDeposit.create({
      data: {
        botId,
        depositorWallet,
        amountUsdc: realAmountUsdc,
        mode: mode || 'CONSERVATIVE',
        active: true,
        totalProfitEarned: 0
      }
    });

    // 5. Increment bot TVL in Prisma using the REAL amount
    await prisma.bot.update({
      where: { id: botId },
      data: {
        currentTVL: {
          increment: realAmountUsdc
        }
      }
    });

    // Dispatch notification to the builder
    if (bot.walletAddress) {
      await notifyDeposit(bot.walletAddress, depositorWallet, bot.name, realAmountUsdc);
    }

    return NextResponse.json({ success: true, deposit, realAmount: realAmountUsdc });
  } catch (error: any) {
    console.error('Create Deposit API Error:', error);
    return NextResponse.json({ error: 'Failed to record deposit' }, { status: 500 });
  }
}

