'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Klienti', href: '/clients' },
  { name: 'Záznamy', href: '/entries' },
  { name: 'Reporty', href: '/reports' },
  { name: 'Nastavení', href: '/settings' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/login')
  }, [signOut, router])

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-black text-white px-2 py-1 font-bold text-sm">
              WORK
            </div>
            <div className="bg-black text-white px-2 py-1 font-bold text-sm">
              TRACKER
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-1 py-2 text-sm font-medium transition-colors border-b-2',
                    isActive
                      ? 'border-primary text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Desktop User Info & Sign Out */}
          <div className="hidden md:flex items-center gap-4">
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

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Otevřít menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 py-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-base font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
            {user && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="px-3 py-2 text-sm text-gray-600">
                  {user.email}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  Odhlásit se
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
