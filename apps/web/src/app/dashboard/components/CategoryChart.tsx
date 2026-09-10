"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface Props {
  data: { name: string; value: number; color: string }[]
  formatMoney: (n: number, c: string) => string
  currency: string
}

function CustomTooltip({ active, payload, formatMoney, currency }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{formatMoney(item.value, currency)}</p>
    </div>
  )
}

export default function CategoryChart({ data, formatMoney, currency }: Props) {
  if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <div className="relative">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip formatMoney={formatMoney} currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatMoney(total, currency)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
          </div>
        </div>
      </div>
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
