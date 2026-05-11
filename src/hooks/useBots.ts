'use client'
import { useQuery } from '@tanstack/react-query'
import type { Bot } from '@/data/bots'

export function useBots(sort = 'brier', filter = 'all') {
  return useQuery<Bot[]>({
    queryKey: ['bots', sort, filter],
    queryFn: async () => {
      const res = await fetch(`/api/bots?sort=${sort}&status=LIVE`)
      if (!res.ok) throw new Error('Failed to fetch bots')
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function useBot(slug: string) {
  return useQuery<Bot>({
    queryKey: ['bot', slug],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${slug}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
    staleTime: 60_000,
  })
}
