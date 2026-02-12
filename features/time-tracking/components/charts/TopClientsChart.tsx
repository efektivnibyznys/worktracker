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
import { TopClientDataPoint } from '@/lib/utils/chartData'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TopClientsChartProps {
  data: TopClientDataPoint[]
  title?: string
  description?: string
  currency?: string
  year?: number
  onClientClick?: (client: TopClientDataPoint) => void
}

export function TopClientsChart({
  data,
  title = 'Top klienti podle výnosů',
  description,
  currency = 'Kč',
  year,
  onClientClick
}: TopClientsChartProps) {
  const defaultDescription = year ? `Přehled nejvýnosnějších klientů za rok ${year}` : 'Přehled nejvýnosnějších klientů'

  // Prázdný stav
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description || defaultDescription}</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-4xl mb-2">🏆</p>
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
        <p className="font-semibold mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Výnosy:</span>
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

  const maxAmount = Math.max(...data.map(d => d.amount))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description || defaultDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            />

            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey="amount"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              onClick={onClientClick ? (data: any) => {
                if (data && data.payload) {
                  onClientClick(data.payload as TopClientDataPoint)
                }
              } : undefined}
              style={{ cursor: onClientClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Statistika celkem */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Celkem výnosy</p>
              <p className="text-2xl font-bold">
                {formatCurrency(data.reduce((sum, item) => sum + item.amount, 0), currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Celkem hodin</p>
              <p className="text-2xl font-bold">
                {data.reduce((sum, item) => sum + item.hours, 0).toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Počet klientů</p>
              <p className="text-2xl font-bold">
                {data.length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
