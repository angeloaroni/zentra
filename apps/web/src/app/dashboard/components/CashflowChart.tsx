"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Props {
  data: { month: string; label: string; income: number; expense: number }[]
  formatMoney: (n: number, c: string) => string
  currency: string
}

export default function CashflowChart({ data, formatMoney, currency }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
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
        <Tooltip
          formatter={(value: number, name: string) => [
            formatMoney(value, currency),
            name === "income" ? "Ingresos" : "Gastos",
          ]}
        />
        <Legend
          formatter={(value) => (value === "income" ? "Ingresos" : "Gastos")}
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ fill: "#10B981", r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#EF4444"
          strokeWidth={2}
          dot={{ fill: "#EF4444", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
