'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MonthlyHoursDataPoint } from '@/lib/utils/chartData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface MonthlyHoursChartProps {
  data: MonthlyHoursDataPoint[]
  title?: string
  description?: string
  year: number
}

export function MonthlyHoursChart({
  data,
  title = 'Měsíční přehled hodin',
  description = 'Odpracované hodiny za jednotlivé měsíce',
  year
}: MonthlyHoursChartProps) {
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
        <p className="font-semibold mb-2">{label} {year}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
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

  const maxHours = Math.max(...data.map(d => d.hours))

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
            <defs>
              <linearGradient id="colorHoursBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4} />
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
              label={{ value: 'Hodiny', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, Math.ceil(maxHours * 1.1)]}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey="hours"
              fill="url(#colorHoursBar)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Statistika celkem */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Celkem hodin</p>
              <p className="text-2xl font-bold">
                {data.reduce((sum, item) => sum + item.hours, 0).toFixed(1)}
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Průměr/měsíc</p>
              <p className="text-2xl font-bold">
                {(data.reduce((sum, item) => sum + item.hours, 0) / 12).toFixed(1)}
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Celkem záznamů</p>
              <p className="text-2xl font-bold">
                {data.reduce((sum, item) => sum + item.count, 0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
