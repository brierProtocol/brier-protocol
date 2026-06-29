import { useState, useEffect } from 'react'

export function useCurrentUser(address?: string) {
  const [user, setUser] = useState<{ handle?: string | null; name?: string | null; pfpUrl?: string | null } | null>(null)
  
  useEffect(() => {
    if (!address) {
      setUser(null)
      return
    }
    fetch(`/api/users?address=${address}&t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) setUser(d.user)
      })
      .catch(() => {})
  }, [address])
  
  return user
}
