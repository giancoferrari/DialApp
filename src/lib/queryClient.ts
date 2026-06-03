import { QueryClient } from '@tanstack/react-query'

// Stale-while-revalidate defaults: returning to a tab shows cached data
// instantly, then refreshes quietly in the background.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s "fresh" — instant returns within that window
      gcTime: 5 * 60_000,         // keep unused cache around for 5 min
      refetchOnWindowFocus: true, // refresh when the app regains focus
      retry: 1,
    },
  },
})
