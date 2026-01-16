'use client'

import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { InvoiceStats } from '../types/invoice.types'

interface InvoiceStatsCardsProps {
  stats: InvoiceStats | undefined
  isLoading?: boolean
}

/**
 * Grid of cards showing invoice statistics
 */
export function InvoiceStatsCards({ stats, isLoading }: InvoiceStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-8 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-white p-6 shadow-md animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-4">
      {/* Total invoices */}
      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Celkem faktur
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold">{stats?.totalCount || 0}</div>
          <p className="text-lg text-gray-700 mt-2">
            {formatCurrency(stats?.totalAmount || 0)}
          </p>
        </CardContent>
      </Card>

      {/* Unpaid invoices */}
      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Nezaplacené
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-orange-600">
            {(stats?.issuedCount || 0) + (stats?.overdueCount || 0)}
          </div>
          <p className="text-lg text-gray-700 mt-2">
            {formatCurrency(stats?.unpaidAmount || 0)}
          </p>
        </CardContent>
      </Card>

      {/* Paid invoices */}
      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Zaplacené
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-green-600">
            {stats?.paidCount || 0}
          </div>
          <p className="text-lg text-gray-700 mt-2">
            {formatCurrency(stats?.paidAmount || 0)}
          </p>
        </CardContent>
      </Card>

      {/* Overdue + drafts */}
      <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-0 mb-4">
          <CardDescription className="text-sm text-gray-600 font-medium">
            Po splatnosti
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-red-600">
            {stats?.overdueCount || 0}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {stats?.draftCount || 0} konceptů
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
