export interface BuilderBot {
  id: string;
  name: string;
  status: "live" | "shadow";
  tvl: number;
  brierScore: number;
  resolvedPredictions: number;
}

export interface Builder {
  address: string;
  handle: string;
  avatarUrl?: string;
  bots: BuilderBot[];
  trustInputs: {
    uptime: number;
    incidentFreeScore: number;
    auditScore: number;
    userRetention: number;
  };
  consistency: number;
}

export interface BuilderRanked extends Builder {
  globalTVL: number;
  avgBrier: number;
  liveBots: number;
  totalBots: number;
  topBot?: BuilderBot;
}

// Usamos any para el bot crudo porque viene directo de Prisma/API y tiene muchos campos
export function groupBotsByBuilder(rawBots: any[]): Builder[] {
  const byOwner = new Map<string, any[]>();

  for (const bot of rawBots) {
    // Parsear el owner igual que hace authorOf en LeaderboardClient
    let handle = bot?.maker?.handle || bot?.maker?.name;
    if (!handle) {
      const w = bot?.walletAddress || bot?.ownerWallet || 'anon';
      handle = `${w.substring(0, 6)}…${w.length > 6 ? w.substring(w.length - 4) : ''}`;
    }

    const existing = byOwner.get(handle) ?? [];
    existing.push(bot);
    byOwner.set(handle, existing);
  }

  return Array.from(byOwner.entries()).map(([handle, bots]) => {
    const first = bots[0];
    const address = first?.walletAddress || first?.ownerWallet || 'anon';
    
    return {
      address,
      handle,
      avatarUrl: first?.maker?.pfpUrl || first?.pfpUrl,
      bots: bots.map((b) => {
        // Mapear los campos reales que devuelve /api/bots
        const tvl = b.currentTVL ?? b.tvl ?? 0;
        const brierScore = b.scores?.[0]?.brierScore ?? b.brierScore ?? 1; // 1 = worst score si no tiene trades
        const resolvedPredictions = b.scores?.[0]?.totalTrades ?? 0;
        
        return {
          id: b.id,
          name: b.name,
          status: b.status?.toLowerCase() === 'live' ? 'live' : 'shadow',
          tvl,
          brierScore,
          resolvedPredictions,
        };
      }),
      trustInputs: {
        uptime: 1, // Mock para la UI
        incidentFreeScore: 1,
        auditScore: 1,
        userRetention: 1,
      },
      consistency: 1,
    };
  });
}

export function rankBuilders(builders: Builder[]): BuilderRanked[] {
  const ranked = builders.map(b => {
    const globalTVL = b.bots.reduce((sum, bot) => sum + (bot.tvl || 0), 0);
    const liveBots = b.bots.filter(bot => bot.status === 'live').length;
    const sortedBots = [...b.bots].sort((a, b) => (b.tvl || 0) - (a.tvl || 0));

    // Avg. Brier ponderado: bots con más TVL y más trades resueltos pesan más,
    // así un bot chico con 2 trades de suerte no puede arrastrar el promedio.
    let weightedSum = 0;
    let weightTotal = 0;
    for (const bot of b.bots) {
      const w = Math.sqrt(Math.max(bot.tvl, 1)) * Math.log(1 + Math.max(bot.resolvedPredictions, 0));
      const weight = w > 0 ? w : 0.0001; // bots sin trades pesan casi nada, no cero (evita división rota)
      weightedSum += bot.brierScore * weight;
      weightTotal += weight;
    }
    const avgBrier = weightTotal > 0 ? weightedSum / weightTotal : 1;

    return {
      ...b,
      globalTVL,
      avgBrier,
      liveBots,
      totalBots: b.bots.length,
      topBot: sortedBots[0],
    };
  });

  // Menor Brier = mejor. Igual que en LeaderboardClient (lower is better).
  // Desempate: más TVL primero si el Brier es idéntico.
  return ranked.sort((a, b) => {
    if (a.avgBrier !== b.avgBrier) return a.avgBrier - b.avgBrier;
    return b.globalTVL - a.globalTVL;
  });
}
