import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBinaryPayout,
  isWinningSide,
  buildSettlement,
  isOverdue,
  resolvePendingTrades,
  type PendingTrade,
} from './resolution.js';
import { MockPolymarketAdapter, type PolymarketAdapter } from './adapter.js';

test('computeBinaryPayout: winning YES bought at 0.5 doubles', () => {
  assert.equal(computeBinaryPayout(1000, 0.5, true), 2000);
});

test('computeBinaryPayout: losing side pays zero', () => {
  assert.equal(computeBinaryPayout(1000, 0.5, false), 0);
});

test('computeBinaryPayout: winning at 0.8 pays size/0.8', () => {
  assert.equal(computeBinaryPayout(800, 0.8, true), 1000);
});

test('computeBinaryPayout: rejects invalid entryPrice', () => {
  assert.throws(() => computeBinaryPayout(100, 0, true));
  assert.throws(() => computeBinaryPayout(100, 1.5, true));
});

test('isWinningSide is case/space-insensitive', () => {
  assert.equal(isWinningSide(' yes ', 'YES'), true);
  assert.equal(isWinningSide('NO', 'YES'), false);
  assert.equal(isWinningSide('no', 'NO'), true);
});

test('buildSettlement: unresolved market returns null', () => {
  const t: PendingTrade = { id: 't1', botId: 'b1', marketId: 'm1', side: 'YES', size: 1000, entryPrice: 0.5 };
  assert.equal(buildSettlement(t, { resolved: false }), null);
});

test('buildSettlement: winning trade computes payout and profit', () => {
  const t: PendingTrade = { id: 't1', botId: 'b1', marketId: 'm1', side: 'YES', size: 1000, entryPrice: 0.5 };
  const s = buildSettlement(t, { resolved: true, winningOutcome: 'YES' });
  assert.ok(s);
  assert.equal(s.won, true);
  assert.equal(s.payoutUsdc, 2000);
  assert.equal(s.profitUsdc, 1000);
});

test('buildSettlement: losing trade gives zero payout and negative profit', () => {
  const t: PendingTrade = { id: 't1', botId: 'b1', marketId: 'm1', side: 'YES', size: 1000, entryPrice: 0.5 };
  const s = buildSettlement(t, { resolved: true, winningOutcome: 'NO' });
  assert.ok(s);
  assert.equal(s.won, false);
  assert.equal(s.payoutUsdc, 0);
  assert.equal(s.profitUsdc, -1000);
});

test('isOverdue flags trades past their resolution window', () => {
  const FIFTEEN_MIN = 15 * 60 * 1000;
  assert.equal(isOverdue(0, FIFTEEN_MIN + 1, FIFTEEN_MIN), true);
  assert.equal(isOverdue(0, FIFTEEN_MIN - 1, FIFTEEN_MIN), false);
});

test('resolvePendingTrades settles only resolved markets', async () => {
  const trades: PendingTrade[] = [
    { id: 't1', botId: 'b1', marketId: 'm1', side: 'YES', size: 1000, entryPrice: 0.5 },  // wins
    { id: 't2', botId: 'b1', marketId: 'm2', side: 'NO', size: 500, entryPrice: 0.25 },   // wins
    { id: 't3', botId: 'b1', marketId: 'm3', side: 'YES', size: 200, entryPrice: 0.4 },   // unresolved
  ];
  const adapter = new MockPolymarketAdapter({
    m1: { resolved: true, winningOutcome: 'YES' },
    m2: { resolved: true, winningOutcome: 'NO' },
    // m3 omitted → unresolved
  });

  const sinkCalls: string[] = [];
  const out = await resolvePendingTrades(trades, adapter, async (s) => {
    sinkCalls.push(s.tradeId);
  });

  assert.deepEqual(sinkCalls.sort(), ['t1', 't2']);
  assert.equal(out.length, 2);
  const t1 = out.find((s) => s.tradeId === 't1');
  const t2 = out.find((s) => s.tradeId === 't2');
  assert.ok(t1 && t2);
  assert.equal(t1.payoutUsdc, 2000);   // 1000 / 0.5
  assert.equal(t2.payoutUsdc, 2000);   // 500 / 0.25
});

test('resolvePendingTrades survives a failing adapter call', async () => {
  const trades: PendingTrade[] = [
    { id: 't1', botId: 'b1', marketId: 'boom', side: 'YES', size: 100, entryPrice: 0.5 },
  ];
  const flaky: PolymarketAdapter = {
    getResolution: async () => {
      throw new Error('network down');
    },
  };
  const out = await resolvePendingTrades(trades, flaky, async () => {});
  assert.equal(out.length, 0);
});
