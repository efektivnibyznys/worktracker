'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error('Global application error caught by root error boundary', error, {
      component: 'GlobalErrorBoundary',
      metadata: { digest: error.digest },
    })
  }, [error])

  return (
    <html lang="cs">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="max-w-md w-full">
            <div className="bg-white shadow-lg rounded-lg p-8 text-center border border-gray-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Kritická chyba aplikace
              </h2>

              <p className="text-gray-600 mb-6">
                Omlouváme se, ale došlo k vážné chybě. Zkuste obnovit stránku.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={reset}
                  className="px-6 py-2 bg-primary text-gray-900 rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  Obnovit aplikaci
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Obnovit stránku
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
