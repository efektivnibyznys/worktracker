import { QueryClient } from '@tanstack/react-query'

export class AccountQueryCache {
  private current: { userId: string | null; client: QueryClient } | null = null

  forUser(userId: string | null): QueryClient {
    if (!this.current || this.current.userId !== userId) {
      this.current = {
        userId,
        client: new QueryClient({
          defaultOptions: {
            queries: {
              staleTime: 60 * 1000,
              refetchOnWindowFocus: true,
            },
          },
        }),
      }
    }
    return this.current.client
  }
}
