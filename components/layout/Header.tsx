'use client'

import { useCallback, useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Klienti', href: '/clients' },
  { name: 'Záznamy', href: '/entries' },
  { name: 'Faktury', href: '/invoices' },
  { name: 'Reporty', href: '/reports' },
  { name: 'Nastavení', href: '/settings' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/login')
  }, [signOut, router])

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
    if (!mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
    document.body.style.overflow = 'auto'
  }

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 bg-white z-50 transition-shadow duration-200 ${isScrolled ? 'shadow-md' : ''} border-b border-border`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="bg-black text-white px-2 py-1 font-bold text-sm">
                WORK
              </div>
              <div className="bg-black text-white px-2 py-1 font-bold text-sm">
                TRACKER
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'font-medium transition duration-200 relative',
                    isActive
                      ? 'text-black after:content-[""] after:absolute after:w-full after:h-[2px] after:bg-black after:bottom-[-4px] after:left-0'
                      : 'text-black hover:text-black after:content-[""] after:absolute after:w-0 after:h-[2px] after:bg-black after:bottom-[-4px] after:left-0 hover:after:w-full after:transition-all after:duration-300'
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
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="rounded-none font-semibold px-6 py-3 border-2 border-black hover:bg-gray-100 text-black transition duration-200"
                >
                  Odhlásit se
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="text-gray-900 hover:text-gray-700 focus:outline-none z-50"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
      </header>

      {/* Overlay background */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu */}
      <div className={`fixed top-16 left-0 right-0 md:hidden bg-white shadow-lg z-50 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  'block px-3 py-2 font-medium relative',
                  isActive
                    ? 'text-black after:content-[""] after:absolute after:w-full after:h-[2px] after:bg-black after:bottom-[0] after:left-0'
                    : 'text-black hover:text-black after:content-[""] after:absolute after:w-0 after:h-[2px] after:bg-black after:bottom-[0] after:left-0 hover:after:w-full after:transition-all after:duration-300'
                )}
              >
                {item.name}
              </Link>
            )
          })}
          {user && (
            <div className="mt-4 px-3 py-2 border-t border-border pt-4">
              <div className="px-0 py-2 text-sm text-muted-foreground">
                {user.email}
              </div>
              <button
                onClick={() => {
                  closeMobileMenu()
                  handleSignOut()
                }}
                className="w-full rounded-none font-semibold px-6 py-3 border-2 border-black hover:bg-gray-100 text-black transition duration-200"
              >
                Odhlásit se
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
