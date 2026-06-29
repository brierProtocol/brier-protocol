import { redirect } from 'next/navigation'

// `/vault` used to render a hardcoded "SIGMA-7" demo stub (fake TVL, fake tx).
// Real vault interaction lives at `/vault/[botId]`; send bare `/vault` visitors
// to discover a bot to fund instead of showing fabricated numbers.
export default function VaultIndexPage() {
  redirect('/discover')
}
