'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { AverageRateDataPoint } from '@/lib/utils/chartData'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AverageRateChartProps {
  data: AverageRateDataPoint[]
  defaultRate?: number
  title?: string
  description?: string
  currency?: string
  year: number
}

export function AverageRateChart({
  data,
  defaultRate,
  title = 'Průměrná hodinová sazba',
  description = 'Vývoj průměrné hodinové sazby v čase',
  currency = 'Kč',
  year
}: AverageRateChartProps) {
  // Prázdný stav
  if (data.length === 0 || data.every(d => d.averageRate === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-4xl mb-2">💹</p>
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

    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold mb-2">{label} {year}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Průměrná sazba:</span>
            <span className="font-medium">{formatCurrency(data.averageRate, currency)}/h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Celkem hodin:</span>
            <span className="font-medium">{data.totalHours.toFixed(2)} h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Záznamy:</span>
            <span className="font-medium">{data.count}</span>
          </div>
          {defaultRate && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <span className="text-muted-foreground">Výchozí sazba:</span>
              <span className="font-medium">{formatCurrency(defaultRate, currency)}/h</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Filtrujeme data s nenulovými hodnotami pro výpočet min/max
  const dataWithValues = data.filter(d => d.averageRate > 0)
  const rates = dataWithValues.map(d => d.averageRate)
  const minRate = Math.min(...rates, defaultRate || Infinity)
  const maxRate = Math.max(...rates, defaultRate || 0)

  // Určíme rozsah Y-osy s malým paddingem
  const yAxisMin = Math.floor(minRate * 0.9)
  const yAxisMax = Math.ceil(maxRate * 1.1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />

            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'Kč/h', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[yAxisMin, yAxisMax]}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Referenční čára pro výchozí sazbu */}
            {defaultRate && (
              <ReferenceLine
                y={defaultRate}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{
                  value: 'Výchozí sazba',
                  position: 'right',
                  fill: '#64748b',
                  fontSize: 12
                }}
              />
            )}

            {/* Linie pro průměrnou sazbu */}
            <Line
              type="monotone"
              dataKey="averageRate"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Statistika celkem */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Průměrná sazba</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  dataWithValues.length > 0
                    ? dataWithValues.reduce((sum, item) => sum + item.averageRate, 0) / dataWithValues.length
                    : 0,
                  currency
                )}/h
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Minimální</p>
              <p className="text-2xl font-bold">
                {formatCurrency(rates.length > 0 ? Math.min(...rates) : 0, currency)}/h
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Maximální</p>
              <p className="text-2xl font-bold">
                {formatCurrency(rates.length > 0 ? Math.max(...rates) : 0, currency)}/h
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
