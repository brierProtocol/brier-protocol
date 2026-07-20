export interface WithMomentum {
  delta24h?: number; // % de cambio en las ultimas 24h. undefined = sin dato
}

// Devuelve null si no hay dato real -- nunca inventamos un numero
export function formatMomentum(delta24h?: number): { text: string; positive: boolean } | null {
  if (delta24h === undefined || delta24h === null || Number.isNaN(delta24h)) return null;
  const positive = delta24h >= 0;
  const arrow = positive ? "▲" : "▼";
  return { text: `${arrow} ${Math.abs(delta24h).toFixed(1)}%`, positive };
}


