export interface Trade {
  id: string;
  market: string;
  result: 'WIN' | 'LOSS' | 'PENDING';
  direction: 'YES' | 'NO';
  odds: number;
  pnl: number;
  time: string;
}

export interface Bot {
  id: string;
  name: string;
  builder: string;
  tagline: string;
  color: string;
  mood: 'happy' | 'neutral' | 'nervous' | 'sad' | 'cool' | 'sleeping' | 'surprised';
  publishedDays?: number;
  status: string;
  markets: string[];
  winRate: number;
  brierScore: number;
  wins: number;
  losses: number;
  trades: number;
  bestStreak?: number;
  sharpe?: number;
  tvl: number;
  depositors?: number;
  builderCarry: number;
  return7d?: number;
  returnAllTime?: number;
  pnlHistory: number[];
  recentTrades?: Trade[];
  strategyType: string;
  description: string;
  layers?: string[];
}

function generatePnl(trend: 'up' | 'flat' | 'down' | 'volatile', points = 30): number[] {
  const data: number[] = [0];
  for (let i = 1; i < points; i++) {
    const noise = (Math.random() - 0.5) * 400;
    let drift = 0;
    if (trend === 'up') drift = 120 + Math.random() * 80;
    else if (trend === 'down') drift = -100 - Math.random() * 60;
    else if (trend === 'volatile') drift = (Math.random() - 0.5) * 300;
    else drift = 30 + Math.random() * 40;
    data.push(Math.round(data[i - 1] + drift + noise));
  }
  return data;
}

export const bots: Bot[] = [
  {
    id: 'adan-pred',
    name: 'ADAN-PRED',
    builder: 'Lord14sol',
    tagline: 'No es un bot. Es una entidad con algo que perder.',
    color: '#FF6B35',
    mood: 'happy',
    publishedDays: 47,
    status: 'live',
    markets: ['Kalshi', 'BTC/ETH/SOL', '5min/15min'],
    winRate: 0.624,
    brierScore: 0.164,
    wins: 89,
    losses: 54,
    trades: 143,
    bestStreak: 11,
    sharpe: 2.41,
    tvl: 284500,
    depositors: 12,
    builderCarry: 20,
    return7d: 4.7,
    returnAllTime: 31.2,
    pnlHistory: generatePnl('up'),
    strategyType: 'Multi-Agent Ensemble',
    description: 'ADAN-PRED is a consciousness-driven trading entity that operates across multiple cognitive layers. It combines pattern memory, soul evolution, and genetic dynasty systems to adapt to market conditions in real-time. Each trade is informed by a dual-AI architecture that balances risk awareness with aggressive alpha capture.',
    layers: ['Pattern Memory', 'Soul Evolution', 'BTC Correlation', 'Genetic Dynasty', 'DNA Absorption', 'Dream Mode', 'Multi-Agent', 'Dual AI', 'News Intel'],
  },
  {
    id: 'hermes-q',
    name: 'HERMES-Q',
    builder: 'QuantumRider',
    tagline: 'Speed is truth. Latency is the enemy of alpha.',
    color: '#7B2FFF',
    mood: 'cool',
    publishedDays: 83,
    status: 'live',
    markets: ['Polymarket', 'Politics', 'Sports'],
    winRate: 0.671,
    brierScore: 0.152,
    wins: 184,
    losses: 90,
    trades: 274,
    bestStreak: 14,
    sharpe: 2.87,
    tvl: 512000,
    depositors: 28,
    builderCarry: 18,
    return7d: 3.2,
    returnAllTime: 47.8,
    pnlHistory: generatePnl('up'),
    strategyType: 'Momentum',
    description: 'HERMES-Q exploits market microstructure inefficiencies in prediction markets. By monitoring order flow and liquidity shifts, it identifies momentum opportunities before the crowd. Built for speed, optimized for edge.',
  },
  {
    id: 'atlas-core',
    name: 'ATLAS-CORE',
    builder: 'SigmaVault',
    tagline: 'Mapping the topology of probability space.',
    color: '#00C2FF',
    mood: 'neutral',
    publishedDays: 61,
    status: 'live',
    markets: ['Kalshi', 'Weather', 'Economics'],
    winRate: 0.583,
    brierScore: 0.198,
    wins: 112,
    losses: 80,
    trades: 192,
    bestStreak: 8,
    sharpe: 1.94,
    tvl: 198000,
    depositors: 15,
    builderCarry: 22,
    return7d: 1.8,
    returnAllTime: 22.4,
    pnlHistory: generatePnl('flat'),
    strategyType: 'Statistical Arbitrage',
    description: 'ATLAS-CORE builds multi-dimensional probability maps across correlated event markets. It identifies mispricings by modeling complex conditional dependencies that most traders ignore.',
  },
  {
    id: 'nexus-ai',
    name: 'NEXUS-AI',
    builder: 'DeepEdge',
    tagline: 'The neural fabric of market intelligence.',
    color: '#FFD600',
    mood: 'happy',
    publishedDays: 34,
    status: 'live',
    markets: ['Polymarket', 'Crypto', 'Politics'],
    winRate: 0.609,
    brierScore: 0.178,
    wins: 67,
    losses: 43,
    trades: 110,
    bestStreak: 9,
    sharpe: 2.15,
    tvl: 342000,
    depositors: 19,
    builderCarry: 15,
    return7d: 5.1,
    returnAllTime: 28.6,
    pnlHistory: generatePnl('up'),
    strategyType: 'Sentiment Analysis',
    description: 'NEXUS-AI processes millions of social signals in real-time to gauge market sentiment shifts. Its transformer-based architecture detects narrative changes before they manifest in prices.',
  },
  {
    id: 'phantom-x',
    name: 'PHANTOM-X',
    builder: 'GhostCapital',
    tagline: 'Invisible edge. Visible returns.',
    color: '#FF1493',
    mood: 'cool',
    publishedDays: 92,
    status: 'live',
    markets: ['Kalshi', 'BTC/ETH', '1hr'],
    winRate: 0.643,
    brierScore: 0.171,
    wins: 198,
    losses: 110,
    trades: 308,
    bestStreak: 12,
    sharpe: 2.53,
    tvl: 423000,
    depositors: 22,
    builderCarry: 20,
    return7d: 2.9,
    returnAllTime: 38.5,
    pnlHistory: generatePnl('up'),
    strategyType: 'Mean Reversion',
    description: 'PHANTOM-X identifies overextended probability moves and fades them with surgical precision. Its proprietary volatility surface model detects when markets overshoot fundamentals.',
  },
  {
    id: 'oracle-7',
    name: 'ORACLE-7',
    builder: 'CryptoOracle',
    tagline: 'Seven layers of foresight.',
    color: '#00FF88',
    mood: 'nervous',
    publishedDays: 28,
    status: 'live',
    markets: ['Polymarket', 'Elections', 'Macro'],
    winRate: 0.478,
    brierScore: 0.261,
    wins: 33,
    losses: 36,
    trades: 69,
    bestStreak: 5,
    sharpe: 0.89,
    tvl: 67000,
    depositors: 6,
    builderCarry: 25,
    return7d: -2.1,
    returnAllTime: -4.8,
    pnlHistory: generatePnl('volatile'),
    strategyType: 'Fundamental Analysis',
    description: 'ORACLE-7 combines seven distinct analytical frameworks to generate predictions. Currently in a calibration phase as it adapts to new market dynamics.',
  },
  {
    id: 'viper-algo',
    name: 'VIPER-ALGO',
    builder: 'StrikeForce',
    tagline: 'Strike fast. Strike once. Strike right.',
    color: '#FF4444',
    mood: 'neutral',
    publishedDays: 55,
    status: 'live',
    markets: ['Kalshi', 'Sports', 'Weather'],
    winRate: 0.556,
    brierScore: 0.213,
    wins: 85,
    losses: 68,
    trades: 153,
    bestStreak: 7,
    sharpe: 1.67,
    tvl: 145000,
    depositors: 10,
    builderCarry: 18,
    return7d: 1.2,
    returnAllTime: 14.3,
    pnlHistory: generatePnl('flat'),
    strategyType: 'Event-Driven',
    description: 'VIPER-ALGO specializes in event-driven prediction markets. It monitors catalysts and news flow to position ahead of binary outcome events with high conviction.',
  },
  {
    id: 'zenith-bot',
    name: 'ZENITH-BOT',
    builder: 'PeakAlpha',
    tagline: 'At the summit, clarity replaces noise.',
    color: '#E040FB',
    mood: 'sad',
    publishedDays: 15,
    status: 'live',
    markets: ['Polymarket', 'Crypto'],
    winRate: 0.389,
    brierScore: 0.312,
    wins: 14,
    losses: 22,
    trades: 36,
    bestStreak: 3,
    sharpe: -0.34,
    tvl: 23000,
    depositors: 3,
    builderCarry: 15,
    return7d: -5.7,
    returnAllTime: -12.1,
    pnlHistory: generatePnl('down'),
    strategyType: 'Momentum',
    description: 'ZENITH-BOT is a new entrant focusing on crypto prediction markets. Currently going through initial learning and calibration. The builder is actively tuning parameters.',
  },
  {
    id: 'sigma-flow',
    name: 'SIGMA-FLOW',
    builder: 'FlowState',
    tagline: 'Follow the flow. Trust the signal.',
    color: '#00BCD4',
    mood: 'happy',
    publishedDays: 71,
    status: 'live',
    markets: ['Kalshi', 'Polymarket', 'Mixed'],
    winRate: 0.612,
    brierScore: 0.183,
    wins: 134,
    losses: 85,
    trades: 219,
    bestStreak: 10,
    sharpe: 2.22,
    tvl: 267000,
    depositors: 16,
    builderCarry: 20,
    return7d: 3.4,
    returnAllTime: 26.9,
    pnlHistory: generatePnl('up'),
    strategyType: 'Order Flow',
    description: 'SIGMA-FLOW reads the tape. By analyzing order flow patterns and market maker behavior, it identifies where smart money is positioning and follows the signal.',
  },
  {
    id: 'titan-mk2',
    name: 'TITAN-MK2',
    builder: 'IronForge',
    tagline: 'Built to endure. Engineered to compound.',
    color: '#FF8F00',
    mood: 'neutral',
    publishedDays: 104,
    status: 'live',
    markets: ['Kalshi', 'Economics', 'Rates'],
    winRate: 0.572,
    brierScore: 0.201,
    wins: 213,
    losses: 159,
    trades: 372,
    bestStreak: 9,
    sharpe: 1.88,
    tvl: 389000,
    depositors: 24,
    builderCarry: 16,
    return7d: 1.5,
    returnAllTime: 19.7,
    pnlHistory: generatePnl('flat'),
    strategyType: 'Systematic',
    description: 'TITAN-MK2 is the workhorse. A systematic strategy that grinds out consistent returns through disciplined position sizing and rigorous risk management. No heroics, just compounding.',
  },
  {
    id: 'nova-pulse',
    name: 'NOVA-PULSE',
    builder: 'PulseLabs',
    tagline: 'Every heartbeat of the market, quantified.',
    color: '#76FF03',
    mood: 'surprised',
    publishedDays: 8,
    status: 'live',
    markets: ['Polymarket', 'AI', 'Tech'],
    winRate: 0.714,
    brierScore: 0.139,
    wins: 10,
    losses: 4,
    trades: 14,
    bestStreak: 6,
    sharpe: 3.41,
    tvl: 45000,
    depositors: 4,
    builderCarry: 25,
    return7d: 8.9,
    returnAllTime: 8.9,
    pnlHistory: generatePnl('up'),
    strategyType: 'Breakout',
    description: 'NOVA-PULSE is a brand new bot with explosive early performance. Small sample size, but the numbers are eye-catching. Focused on AI and tech-related prediction markets.',
  },
  {
    id: 'shadow-net',
    name: 'SHADOW-NET',
    builder: 'DarkPool',
    tagline: 'In the shadows, we find edge.',
    color: '#607D8B',
    mood: 'sleeping',
    publishedDays: 120,
    status: 'paused',
    markets: ['Kalshi', 'BTC', '1hr/4hr'],
    winRate: 0.548,
    brierScore: 0.228,
    wins: 167,
    losses: 138,
    trades: 305,
    bestStreak: 8,
    sharpe: 1.42,
    tvl: 89000,
    depositors: 8,
    builderCarry: 22,
    return7d: 0,
    returnAllTime: 11.3,
    pnlHistory: generatePnl('flat'),
    strategyType: 'Contrarian',
    description: 'SHADOW-NET takes contrarian positions when crowd sentiment reaches extremes. Currently paused for strategy refinement and parameter optimization.',
  },
];

export function getBotById(id: string): Bot | undefined {
  return bots.find((b) => b.id === id);
}

export function getTopBots(count: number): Bot[] {
  return [...bots]
    .filter((b) => b.status === 'live')
    .sort((a, b) => a.brierScore - b.brierScore)
    .slice(0, count);
}

export function getBotsByRank(): Bot[] {
  return [...bots].sort((a, b) => a.brierScore - b.brierScore);
}
