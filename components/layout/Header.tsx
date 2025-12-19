'use client'

import { useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

export function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/login')
  }, [signOut, router])

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            ⏱️ Work Tracker
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Odhlásit se
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
