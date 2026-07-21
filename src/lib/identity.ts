// Universal person identity — ONE way to name and label a human across Brier.
// Navbar, bot profile (creator), comments and maker page all resolve through
// here so the same wallet never shows two different names in two places.

export type PersonLike = {
  walletAddress?: string | null
  handle?: string | null
  name?: string | null
  pfpUrl?: string | null
  xHandle?: string | null
  xVerified?: boolean
} | null | undefined

export const shortAddr = (a?: string | null) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—'

/**
 * Display name priority: @handle → real name (ignoring the auto-generated
 * "User_xxxxxx" placeholder) → short wallet address.
 */
export function personLabel(user: PersonLike, wallet?: string | null): string {
  if (user?.handle) return `@${user.handle}`
  if (user?.name && !user.name.startsWith('User_')) return user.name
  return shortAddr(wallet ?? user?.walletAddress)
}
