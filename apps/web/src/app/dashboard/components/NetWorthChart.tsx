"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Props {
  data: { date: string; balance: number }[]
  formatMoney: (n: number, c: string) => string
  currency: string
}

export default function NetWorthChart({ data, formatMoney, currency }: Props) {
  if (!data || data.length <= 1) return <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Datos insuficientes</div>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number) => formatMoney(value, currency)} />
        <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
