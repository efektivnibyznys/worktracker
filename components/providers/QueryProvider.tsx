'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { AccountQueryCache } from './accountQueryCache'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore(state => state.user?.id ?? null)
  const [cache] = useState(() => new AccountQueryCache())
  const queryClient = cache.forUser(userId)

  return (
    <QueryClientProvider key={userId ?? 'signed-out'} client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
