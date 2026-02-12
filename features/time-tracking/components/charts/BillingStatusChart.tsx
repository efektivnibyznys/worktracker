'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { BillingStatusDataPoint } from '@/lib/utils/chartData'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BillingStatusChartProps {
  data: BillingStatusDataPoint[]
  title?: string
  description?: string
  currency?: string
}

export function BillingStatusChart({
  data,
  title = 'Stav fakturace',
  description = 'Přehled zaplacených, fakturovaných a nefakturovaných částek',
  currency = 'Kč'
}: BillingStatusChartProps) {
  // Prázdný stav
  if (data.length === 0 || data.every(d => d.amount === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-4xl mb-2">💰</p>
            <p className="font-medium">Žádná data k zobrazení</p>
            <p className="text-sm">Zkuste upravit filtry nebo přidat záznamy</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold mb-2">{data.label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Částka:</span>
            <span className="font-medium">{formatCurrency(data.amount, currency)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Hodiny:</span>
            <span className="font-medium">{data.hours.toFixed(2)} h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Záznamy:</span>
            <span className="font-medium">{data.count}</span>
          </div>
        </div>
      </div>
    )
  }

  // Celkový součet pro percentuální zobrazení
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />

            <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              width={110}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Statistika celkem */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.map((item) => {
              const percentage = totalAmount > 0 ? Math.round((item.amount / totalAmount) * 100) : 0
              return (
                <div key={item.status} className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="text-sm text-muted-foreground">{item.label}:</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xl font-bold">{formatCurrency(item.amount, currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {percentage}% • {item.hours.toFixed(1)}h
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
