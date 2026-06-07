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

// Curated palette offered when creating a bot — all vivid and legible on black.
export const EYE_PALETTE = [
  '#ff2a4d', // crimson
  '#ff3b6b', // rose-red
  '#ff5a3c', // vermilion
  '#ff7a00', // orange
  '#ffb000', // gold
  '#ffd400', // amber
  '#eaff00', // chartreuse
  '#c8ff00', // acid lime
  '#7bff3c', // green
  '#22e88a', // emerald
  '#00d4aa', // teal
  '#00ffd5', // aqua
  '#00e5ff', // cyan
  '#42c8ff', // sky
  '#4285f0', // blue
  '#5a7cff', // cornflower
  '#6a5cff', // indigo
  '#8b5cff', // amethyst
  '#a96bff', // violet
  '#cf5cff', // purple
  '#e05cff', // magenta
  '#ff5ccd', // pink
  '#ff4f8b', // hot rose
  '#f5f5f5', // white
] as const

// Pupil shapes a maker can pick at creation.
export const EYE_SHAPES = [
  { id: 'round',    label: 'IRIS' },
  { id: 'aperture', label: 'APERTURE' },
  { id: 'cat',      label: 'FELINE' },
  { id: 'diamond',  label: 'DIAMOND' },
  { id: 'scanner',  label: 'SCANNER' },
  { id: 'ring',     label: 'HALO' },
  { id: 'star',     label: 'STAR' },
  { id: 'triangle', label: 'DELTA' },
  { id: 'cross',    label: 'RETICLE' },
  { id: 'spiral',   label: 'VORTEX' },
  { id: 'nova',     label: 'NOVA' },
  { id: 'void',     label: 'VOID' },
] as const

export type EyeShapeId = typeof EYE_SHAPES[number]['id']

// A chosen color is honored only if it's a real 6-char hex that isn't near-black.
function isVividHex(c?: string | null): c is string {
  if (!c || !/^#[0-9a-fA-F]{6}$/.test(c)) return false
  const r = parseInt(c.slice(1, 3), 16)
  const g = parseInt(c.slice(3, 5), 16)
  const b = parseInt(c.slice(5, 7), 16)
  return Math.max(r, g, b) >= 60 // reject #0A0A0A-style dark defaults
}

// Stable eye identity for a bot — identical on discover, leaderboard, detail, maker.
// Returns props that spread directly into <BotIrisAvatar {...botEye(bot)} />.
// Honors a color the maker chose at creation; falls back to a derived vivid color.
export function botEye(bot: { slug?: string | null; id?: string | null; name?: string | null; color?: string | null; eyeShape?: string | null }): {
  avatarId: string
  accentColor: string
  shape?: EyeShapeId
} {
  const seed = (bot?.slug || bot?.id || bot?.name || 'void').toString().toLowerCase()
  const validShape = EYE_SHAPES.some(s => s.id === bot?.eyeShape) ? (bot!.eyeShape as EyeShapeId) : undefined
  return {
    avatarId: seed,
    accentColor: isVividHex(bot?.color) ? bot.color : deriveAvatarColor(seed),
    shape: validShape,
  }
}

// Stable eye identity for a maker/user, derived from their wallet address.
export function makerEye(address: string): { avatarId: string; accentColor: string } {
  const seed = (address || 'anon').toLowerCase()
  return { avatarId: seed, accentColor: deriveAvatarColor(seed) }
}
