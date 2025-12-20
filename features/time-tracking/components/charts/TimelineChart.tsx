'use client'

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TimelineDataPoint } from '@/lib/utils/chartData'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TimelineChartProps {
  data: TimelineDataPoint[]
  title?: string
  description?: string
  currency?: string
}

export function TimelineChart({
  data,
  title = 'Hodiny a výnosy v čase',
  description = 'Přehled odpracovaných hodin a výnosů',
  currency = 'Kč'
}: TimelineChartProps) {
  // Prázdný stav
  if (data.length === 0) {
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

    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Hodiny:</span>
            <span className="font-medium">{data.hours.toFixed(2)} h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Výnosy:</span>
            <span className="font-medium">{formatCurrency(data.amount, currency)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Záznamy:</span>
            <span className="font-medium">{data.count}</span>
          </div>
        </div>
      </div>
    )
  }

  // Najdeme max hodnoty pro lepší škálování os
  const maxHours = Math.max(...data.map(d => d.hours))
  const maxAmount = Math.max(...data.map(d => d.amount))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />

            {/* Levá osa Y - Hodiny */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'Hodiny', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, Math.ceil(maxHours * 1.1)]}
            />

            {/* Pravá osa Y - Výnosy */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'Výnosy (Kč)', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
              domain={[0, Math.ceil(maxAmount * 1.1)]}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />

            {/* Area + Line pro hodiny */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="hours"
              fill="url(#colorHours)"
              stroke="#3b82f6"
              strokeWidth={0}
              name="Hodiny"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="hours"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Hodiny"
            />

            {/* Line pro výnosy */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="amount"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              name="Výnosy"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
