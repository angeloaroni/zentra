"use client"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Props {
  data: { month: string; label: string; income: number; expense: number }[]
  formatMoney: (n: number, c: string) => string
  currency: string
}

function CustomTooltip({ active, payload, label, formatMoney, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.dataKey === "income" ? "Ingresos" : "Gastos"}: {formatMoney(entry.value, currency)}
        </p>
      ))}
    </div>
  )
}

export default function CashflowChart({ data, formatMoney, currency }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
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
        <Legend
          formatter={(value) => (value === "income" ? "Ingresos" : "Gastos")}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#10B981"
          strokeWidth={2}
          fill="url(#colorIncome)"
          dot={{ fill: "#10B981", r: 3 }}
        />
        <Area
          type="monotone"
          dataKey="expense"
          stroke="#EF4444"
          strokeWidth={2}
          fill="url(#colorExpense)"
          dot={{ fill: "#EF4444", r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
