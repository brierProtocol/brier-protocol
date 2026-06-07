// Deterministic avatar identity for bots and makers.
//
// The BotIrisAvatar renders a robotic "eye" whose STRUCTURE comes from `avatarId`
// and whose COLOR comes from `accentColor`. Seed/DB data often stores a useless
// color (e.g. #0A0A0A → an invisible black eye) and a shared avatarId ('void-eye'
// → every eye looks identical). This helper derives BOTH from a stable seed
// (the slug/id/address) so the same entity always renders the SAME eye on every
// page, while different entities get distinct structures and vivid colors.

// FNV-1a + avalanche finalizer — small input changes produce large hash changes,
// so similar slugs ("alpha-quant" vs "adan-pred") land on far-apart hues.
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return h >>> 0
}

function hslToHex(hDeg: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((hDeg / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0, g = 0, b = 0
  if (hDeg < 60) { r = c; g = x; b = 0 }
  else if (hDeg < 120) { r = x; g = c; b = 0 }
  else if (hDeg < 180) { r = 0; g = c; b = x }
  else if (hDeg < 240) { r = 0; g = x; b = c }
  else if (hDeg < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Vivid, always-visible hex color derived from a seed string.
export function deriveAvatarColor(seed: string): string {
  const hue = hash(seed) % 360
  return hslToHex(hue, 85, 60)
}

// Stable eye identity for a bot — identical on discover, leaderboard, detail, maker.
// Returns props that spread directly into <BotIrisAvatar {...botEye(bot)} />.
export function botEye(bot: { slug?: string | null; id?: string | null; name?: string | null }): {
  avatarId: string
  accentColor: string
} {
  const seed = (bot?.slug || bot?.id || bot?.name || 'void').toString().toLowerCase()
  return { avatarId: seed, accentColor: deriveAvatarColor(seed) }
}

// Stable eye identity for a maker/user, derived from their wallet address.
export function makerEye(address: string): { avatarId: string; accentColor: string } {
  const seed = (address || 'anon').toLowerCase()
  return { avatarId: seed, accentColor: deriveAvatarColor(seed) }
}
