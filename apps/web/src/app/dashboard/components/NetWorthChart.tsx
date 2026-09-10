"use client"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Props {
  data: { date: string; balance: number }[]
  formatMoney: (n: number, c: string) => string
  currency: string
}

function CustomTooltip({ active, payload, label, formatMoney, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{label}</p>
      <p className="text-sm text-blue-600">Balance: {formatMoney(payload[0].value, currency)}</p>
    </div>
  )
}

export default function NetWorthChart({ data, formatMoney, currency }: Props) {
  if (!data || data.length <= 1) return <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Datos insuficientes</div>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatMoney(v, currency).replace(/\.00$/, "")}
        />
        <Tooltip content={<CustomTooltip formatMoney={formatMoney} currency={currency} />} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#colorBalance)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
