// Polymarket resolution adapter.
// Isolates ALL live Polymarket connectivity behind one interface, so the rest of
// the executor (and its tests) never touch the network. Swap the implementation
// without changing a line of the resolution logic.

export type MarketResolution =
  | { resolved: false }
  | { resolved: true; winningOutcome: 'YES' | 'NO' };

export interface PolymarketAdapter {
  /** Resolution state of a market by its Polymarket condition/market id. */
  getResolution(marketId: string): Promise<MarketResolution>;
}

/**
 * Deterministic in-memory adapter for tests and local simulation.
 * Seed it with known resolutions; unknown markets report as unresolved.
 */
export class MockPolymarketAdapter implements PolymarketAdapter {
  private readonly resolutions: Map<string, MarketResolution>;

  constructor(resolutions?: Record<string, MarketResolution>) {
    this.resolutions = new Map(Object.entries(resolutions ?? {}));
  }

  setResolution(marketId: string, resolution: MarketResolution): void {
    this.resolutions.set(marketId, resolution);
  }

  async getResolution(marketId: string): Promise<MarketResolution> {
    return this.resolutions.get(marketId) ?? { resolved: false };
  }
}

interface PolymarketMarketResponse {
  closed?: boolean;
  tokens?: Array<{ outcome?: string; winner?: boolean }>;
}

/**
 * Live adapter — queries Polymarket's CLOB API for market resolution.
 *
 * ⚠️ PLUG-IN POINT (esto es lo que se enchufa con TUS credenciales):
 *   - POLYMARKET_CLOB_URL: endpoint base (por defecto el público).
 *   - Si usas la API autenticada (L2), añade tu cabecera Authorization donde se indica.
 *   - Para confirmación on-chain extra, consulta también
 *     ConditionalTokens.payoutDenominator(conditionId) > 0 vía ethers.
 *
 * Para mercados de 5-15 min, este adapter es el que el watcher consulta cada
 * pocos segundos hasta detectar `closed`.
 */
export class LivePolymarketAdapter implements PolymarketAdapter {
  private readonly clobBase: string;

  constructor(clobBase: string = process.env.POLYMARKET_CLOB_URL ?? 'https://clob.polymarket.com') {
    this.clobBase = clobBase.replace(/\/+$/, '');
  }

  async getResolution(marketId: string): Promise<MarketResolution> {
    // TODO(credentials): si usas el API L2 autenticado, añade aquí:
    //   const headers = { Authorization: `Bearer ${process.env.POLYMARKET_API_KEY}` };
    const res = await fetch(`${this.clobBase}/markets/${encodeURIComponent(marketId)}`);
    if (!res.ok) {
      throw new Error(`Polymarket CLOB responded ${res.status} for market ${marketId}`);
    }

    const data = (await res.json()) as PolymarketMarketResponse;
    if (!data.closed) return { resolved: false };

    // tokens[i].winner marks the winning outcome token; map its label to YES/NO.
    const winner = data.tokens?.find((t) => t.winner === true);
    if (!winner) return { resolved: false };

    const label = (winner.outcome ?? '').trim().toUpperCase();
    return { resolved: true, winningOutcome: label === 'NO' ? 'NO' : 'YES' };
  }
}
