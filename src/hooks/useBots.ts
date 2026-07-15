import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import type { Bot } from '@/types/index'

export function useBots(sort = 'brier', filter = 'all', limit = 20) {
  return useInfiniteQuery({
    queryKey: ['bots', sort, filter],
    queryFn: async ({ pageParam }) => {
      const cursorPart = pageParam ? `&cursor=${pageParam}` : ''
      const res = await fetch(`/api/bots?sort=${sort}&status=LIVE&limit=${limit}${cursorPart}`)
      if (!res.ok) throw new Error('Failed to fetch bots')
      return res.json()
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    retry: 2,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
