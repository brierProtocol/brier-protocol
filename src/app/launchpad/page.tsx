import { redirect } from 'next/navigation'

// Shadow Market / token launchpad is out of scope for v1 (vaults-first).
// Kept as a redirect so the route never exposes token UI.
export default function Launchpad() {
  redirect('/app')
}
