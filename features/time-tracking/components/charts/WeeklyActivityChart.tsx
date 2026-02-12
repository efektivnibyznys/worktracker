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
import { WeeklyActivityDataPoint } from '@/lib/utils/chartData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface WeeklyActivityChartProps {
  data: WeeklyActivityDataPoint[]
  title?: string
  description?: string
}

export function WeeklyActivityChart({
  data,
  title = 'Aktivita v týdnu',
  description = 'Průměrné odpracované hodiny podle dne v týdnu',
}: WeeklyActivityChartProps) {
  // Prázdný stav
  if (data.length === 0 || data.every(d => d.hours === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-4xl mb-2">📅</p>
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
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-muted-foreground">Průměrné hodiny:</span>
            <span className="font-medium">{data.hours.toFixed(2)} h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Celkem záznamů:</span>
            <span className="font-medium">{data.count}</span>
          </div>
        </div>
      </div>
    )
  }

  const maxHours = Math.max(...data.map(d => d.hours))

  // Určíme barvu podle pracovního/víkendového dne
  const getBarColor = (dayIndex: number) => {
    // 5 = sobota, 6 = neděle
    return dayIndex >= 5 ? '#a855f7' : '#8b5cf6' // violet-400 (weekend) vs violet-500 (weekday)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`colorDay${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getBarColor(entry.dayIndex)} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={getBarColor(entry.dayIndex)} stopOpacity={0.4} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

            <XAxis
              dataKey="day"
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
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <rect
                  key={`bar-${index}`}
                  fill={`url(#colorDay${index})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Statistika celkem */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Nejproduktivnější den</p>
              <p className="text-xl font-bold">
                {data.reduce((max, item) => item.hours > max.hours ? item : max, data[0]).day}
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Průměr/den</p>
              <p className="text-xl font-bold">
                {(data.reduce((sum, item) => sum + item.hours, 0) / 7).toFixed(1)} h
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
