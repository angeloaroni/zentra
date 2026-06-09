"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface Props {
  data: { name: string; value: number; color: string }[]
  formatMoney: (n: number, c: string) => string
  currency: string
}

export default function CategoryChart({ data, formatMoney, currency }: Props) {
  if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={65}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2.5">
        {data.slice(0, 5).map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
            <span className="font-medium text-gray-900 dark:text-white min-w-0 truncate">{formatMoney(item.value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
