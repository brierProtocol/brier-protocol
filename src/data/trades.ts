export interface Trade {
  id: string;
  time: string;
  market: string;
  direction: 'YES' | 'NO';
  odds: number;
  result: 'WIN' | 'LOSS';
  pnl: number;
  confidence: number;
  edge: number;
}

export const mockTrades: Trade[] = [
  { id: 't1', time: '2025-05-09 14:32', market: 'BTC > $63,500 (5min)', direction: 'YES', odds: 0.62, result: 'WIN', pnl: 38.00, confidence: 0.78, edge: 0.16 },
  { id: 't2', time: '2025-05-09 14:17', market: 'ETH > $2,450 (15min)', direction: 'NO', odds: 0.44, result: 'WIN', pnl: 56.00, confidence: 0.71, edge: 0.27 },
  { id: 't3', time: '2025-05-09 13:55', market: 'BTC > $63,800 (5min)', direction: 'YES', odds: 0.55, result: 'LOSS', pnl: -55.00, confidence: 0.61, edge: 0.06 },
  { id: 't4', time: '2025-05-09 13:42', market: 'SOL > $145 (15min)', direction: 'YES', odds: 0.68, result: 'WIN', pnl: 32.00, confidence: 0.82, edge: 0.14 },
  { id: 't5', time: '2025-05-09 13:28', market: 'BTC > $63,200 (5min)', direction: 'YES', odds: 0.71, result: 'WIN', pnl: 29.00, confidence: 0.84, edge: 0.13 },
  { id: 't6', time: '2025-05-09 13:15', market: 'ETH > $2,430 (5min)', direction: 'NO', odds: 0.38, result: 'LOSS', pnl: -38.00, confidence: 0.58, edge: 0.20 },
  { id: 't7', time: '2025-05-09 12:58', market: 'BTC > $63,000 (15min)', direction: 'YES', odds: 0.59, result: 'WIN', pnl: 41.00, confidence: 0.74, edge: 0.15 },
  { id: 't8', time: '2025-05-09 12:41', market: 'SOL > $144 (5min)', direction: 'YES', odds: 0.65, result: 'WIN', pnl: 35.00, confidence: 0.79, edge: 0.14 },
  { id: 't9', time: '2025-05-09 12:27', market: 'BTC > $62,800 (5min)', direction: 'NO', odds: 0.42, result: 'WIN', pnl: 58.00, confidence: 0.76, edge: 0.34 },
  { id: 't10', time: '2025-05-09 12:12', market: 'ETH > $2,420 (15min)', direction: 'YES', odds: 0.53, result: 'LOSS', pnl: -53.00, confidence: 0.62, edge: 0.09 },
  { id: 't11', time: '2025-05-09 11:58', market: 'BTC > $62,500 (5min)', direction: 'YES', odds: 0.74, result: 'WIN', pnl: 26.00, confidence: 0.86, edge: 0.12 },
  { id: 't12', time: '2025-05-09 11:44', market: 'SOL > $143 (15min)', direction: 'NO', odds: 0.35, result: 'WIN', pnl: 65.00, confidence: 0.81, edge: 0.46 },
  { id: 't13', time: '2025-05-09 11:31', market: 'BTC > $62,200 (5min)', direction: 'YES', odds: 0.61, result: 'WIN', pnl: 39.00, confidence: 0.73, edge: 0.12 },
  { id: 't14', time: '2025-05-09 11:18', market: 'ETH > $2,400 (5min)', direction: 'YES', odds: 0.58, result: 'LOSS', pnl: -58.00, confidence: 0.64, edge: 0.06 },
  { id: 't15', time: '2025-05-09 11:04', market: 'BTC > $62,000 (15min)', direction: 'YES', odds: 0.69, result: 'WIN', pnl: 31.00, confidence: 0.83, edge: 0.14 },
  { id: 't16', time: '2025-05-09 10:51', market: 'SOL > $142 (5min)', direction: 'NO', odds: 0.41, result: 'LOSS', pnl: -41.00, confidence: 0.59, edge: 0.18 },
  { id: 't17', time: '2025-05-09 10:38', market: 'BTC > $61,800 (5min)', direction: 'YES', odds: 0.66, result: 'WIN', pnl: 34.00, confidence: 0.80, edge: 0.14 },
  { id: 't18', time: '2025-05-09 10:25', market: 'ETH > $2,380 (15min)', direction: 'YES', odds: 0.57, result: 'WIN', pnl: 43.00, confidence: 0.72, edge: 0.15 },
  { id: 't19', time: '2025-05-09 10:11', market: 'BTC > $61,500 (5min)', direction: 'NO', odds: 0.36, result: 'WIN', pnl: 64.00, confidence: 0.77, edge: 0.41 },
  { id: 't20', time: '2025-05-09 09:58', market: 'SOL > $141 (15min)', direction: 'YES', odds: 0.63, result: 'LOSS', pnl: -63.00, confidence: 0.68, edge: 0.05 },
];
