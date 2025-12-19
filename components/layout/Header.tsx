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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white px-2 py-1 font-bold text-sm">
              WORK
            </div>
            <div className="bg-black text-white px-2 py-1 font-bold text-sm">
              TRACKER
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-900 hover:bg-gray-50 rounded-md transition-colors"
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
