'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { InvoiceFilters, InvoiceStatus, InvoiceType } from '../types/invoice.types'
import type { ClientWithStats } from '@/features/time-tracking/types/client.types'

interface InvoiceFiltersCardProps {
  filters: InvoiceFilters
  onFilterChange: (key: keyof InvoiceFilters, value: string) => void
  onClearFilters: () => void
  clients: ClientWithStats[]
}

/**
 * Filter card for invoice list
 */
export function InvoiceFiltersCard({
  filters,
  onFilterChange,
  onClearFilters,
  clients
}: InvoiceFiltersCardProps) {
  const hasFilters = filters.clientId || filters.status || filters.invoiceType ||
    filters.dateFrom || filters.dateTo

  return (
    <Card className="bg-white p-8 shadow-md">
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-2xl font-bold">Filtry</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Client filter */}
          <div>
            <Label htmlFor="client">Klient</Label>
            <Select
              value={filters.clientId || 'all'}
              onValueChange={(value) =>
                onFilterChange('clientId', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Všichni klienti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všichni klienti</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div>
            <Label htmlFor="status">Stav</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                onFilterChange('status', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Všechny stavy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="draft">Koncept</SelectItem>
                <SelectItem value="issued">Vystavena</SelectItem>
                <SelectItem value="sent">Odeslána</SelectItem>
                <SelectItem value="paid">Zaplacena</SelectItem>
                <SelectItem value="overdue">Po splatnosti</SelectItem>
                <SelectItem value="cancelled">Stornována</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type filter */}
          <div>
            <Label htmlFor="type">Typ</Label>
            <Select
              value={filters.invoiceType || 'all'}
              onValueChange={(value) =>
                onFilterChange('invoiceType', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Všechny typy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                <SelectItem value="linked">Ze záznamů</SelectItem>
                <SelectItem value="standalone">Vlastní položky</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div>
            <Label htmlFor="dateFrom">Od data</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Date to */}
          <div>
            <Label htmlFor="dateTo">Do data</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Clear filters button */}
        {hasFilters && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Vymazat filtry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
