import { useState, useEffect } from 'react'

export type CurrentUser = {
  walletAddress?: string | null
  handle?: string | null
  name?: string | null
  bio?: string | null
  pfpUrl?: string | null
  xHandle?: string | null
  xVerified?: boolean
}

// Broadcast a profile change so every surface (navbar, avatars) updates without
// a reload. The maker page fires this right after saving.
export const PROFILE_UPDATED_EVENT = 'brier:profile-updated'
export function broadcastProfileUpdate(user: CurrentUser) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: user }))
  }
}

export function useCurrentUser(address?: string) {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    if (!address) { setUser(null); return }
    let alive = true

    const load = () => {
      fetch(`/api/users?address=${address}&t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (alive && d?.user) setUser(d.user) })
        .catch(() => {})
    }
    load()

    // Live sync: when the user saves their profile anywhere in the app, refresh
    // immediately if the change is for THIS wallet (no page reload needed).
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as CurrentUser | undefined
      if (detail?.walletAddress && detail.walletAddress.toLowerCase() === address.toLowerCase()) {
        setUser(prev => ({ ...prev, ...detail }))
      } else {
        load()
      }
    }
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdate)
    return () => { alive = false; window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdate) }
  }, [address])

  return user
}
