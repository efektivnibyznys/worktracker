'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { MonthlyRevenueDataPoint } from '@/lib/utils/chartData'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueDataPoint[]
  clientKeys: Array<{ id: string; name: string; color: string }>
  title?: string
  description?: string
  currency?: string
  year: number
}

export function MonthlyRevenueChart({
  data,
  clientKeys,
  title = 'Měsíční výnosy podle klientů',
  description = 'Rozdělení výnosů mezi klienty v jednotlivých měsících',
  currency = 'Kč',
  year
}: MonthlyRevenueChartProps) {
  // Prázdný stav
  if (data.length === 0 || clientKeys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-4xl mb-2">📊</p>
            <p className="font-medium">Žádná data k zobrazení</p>
            <p className="text-sm">Zkuste upravit filtry nebo přidat záznamy</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    // Seřadíme payload podle hodnoty (největší nahoře)
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value)

    const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0)

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-semibold mb-2">{label} {year}</p>
        <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
          {sortedPayload.map((item: any, index: number) => {
            if (item.value === 0) return null
            return (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground truncate flex-1">
                  {item.name}:
                </span>
                <span className="font-medium flex-shrink-0">
                  {formatCurrency(item.value, currency)}
                </span>
              </div>
            )
          })}
          <div className="pt-1 mt-1 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Celkem:</span>
              <span className="font-bold">{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Najdeme max hodnotu pro lepší škálování
  const maxValue = Math.max(
    ...data.map(d => {
      return clientKeys.reduce((sum, client) => sum + (d[client.id] as number || 0), 0)
    })
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />

            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'Výnosy (Kč)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, Math.ceil(maxValue * 1.1)]}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />

            {/* Stacked bars pro každého klienta */}
            {clientKeys.map((client) => (
              <Bar
                key={client.id}
                dataKey={client.id}
                stackId="revenue"
                fill={client.color}
                name={client.name}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Statistika celkem */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Celkem výnosy</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  data.reduce((sum, month) => {
                    return sum + clientKeys.reduce(
                      (clientSum, client) => clientSum + (month[client.id] as number || 0),
                      0
                    )
                  }, 0),
                  currency
                )}
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Průměr/měsíc</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  data.reduce((sum, month) => {
                    return sum + clientKeys.reduce(
                      (clientSum, client) => clientSum + (month[client.id] as number || 0),
                      0
                    )
                  }, 0) / 12,
                  currency
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
