"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, getUser } from "@/lib/api"
import { useSettings, formatMoney, formatDateShort, formatMonthYear, useHasHydrated } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Card, CardContent } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

interface Summary {
  totalIncome: number
  totalExpense: number
  balance: number
  savingsRate: number
}

interface Transaction {
  id: string
  type: string
  title: string
  amount: number
  currency: string
  date: string
  category: { name: string; color: string; icon: string }
}

interface CategoryBreakdown {
  categoryId: string
  _sum: { amount: number }
  _count: number
  category?: { name: string; color: string; icon: string }
}

interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  color?: string
  deadline?: string
}

interface Comparison {
  current: { income: number; expense: number; balance: number }
  previous: { income: number; expense: number; balance: number }
  changes: { income: number; expense: number; balance: number }
}

interface CashflowItem {
  month: string
  label: string
  income: number
  expense: number
  balance: number
}

function formatDate(d: string) {
  return formatDateShort(d)
}

const COLORS = ["#3B82F6", "#6366F1", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"]

function ComparisonTag({ value, invertColor = false }: { value: number; invertColor?: boolean }) {
  if (value === 0) return null
  const isPositive = value > 0
  const good = invertColor ? !isPositive : isPositive
  return (
    <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${good ? "text-emerald-600" : "text-rose-600"}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      <span>{Math.abs(value).toFixed(1)}% vs mes anterior</span>
    </div>
  )
}

export default function DashboardPage() {
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const { activeFamilyId } = useFamilyStore()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const now = new Date()

  const [dateRange, setDateRange] = useState({
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
  })

  useEffect(() => {
    setUser(getUser())
    setMounted(true)
  }, [])

  const familyParam = activeFamilyId ? `&familyId=${activeFamilyId}` : ""

  const { data: summary } = useQuery<Summary>({
    queryKey: ["summary", dateRange.startDate, dateRange.endDate, activeFamilyId],
    queryFn: () =>
      api(`/transactions/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${familyParam}`),
  })

  const { data: txData } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ["transactions-recent", dateRange.startDate, dateRange.endDate, activeFamilyId],
    queryFn: () =>
      api(`/transactions?take=8&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${familyParam}`),
  })

  const { data: byCategory } = useQuery<CategoryBreakdown[]>({
    queryKey: ["by-category", dateRange.startDate, dateRange.endDate, activeFamilyId],
    queryFn: () =>
      api(`/transactions/by-category?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${familyParam}`),
  })

  const { data: goals } = useQuery<Goal[]>({
    queryKey: ["goals", activeFamilyId],
    queryFn: () => api(`/goals${activeFamilyId ? `?familyId=${activeFamilyId}` : ""}`),
  })

  const { data: comparison } = useQuery<Comparison>({
    queryKey: ["comparison", activeFamilyId],
    queryFn: () => api(`/transactions/comparison${familyParam}`),
  })

  const { data: cashflow } = useQuery<CashflowItem[]>({
    queryKey: ["cashflow", activeFamilyId],
    queryFn: () => api(`/transactions/cashflow?months=6${familyParam}`),
  })

  const pieData = (byCategory || []).map((item, i) => ({
    name: item.category?.name || "Otro",
    value: item._sum.amount,
    color: item.category?.color || COLORS[i % COLORS.length],
  }))

  const totalIncome = summary?.totalIncome || 0
  const totalExpense = summary?.totalExpense || 0
  const activeGoals = (goals || []).filter(g => g.currentAmount < g.targetAmount)

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hola, ...</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Cargando...</p>
          </div>
        </div>
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hola, {mounted ? (user?.name || "Usuario") : "..."}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {activeFamilyId
              ? `Vista familiar · ${formatMonthYear(new Date(dateRange.startDate))}`
              : formatMonthYear(new Date(dateRange.startDate))
            }
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-5 w-5 opacity-70" />
          <span className="text-sm opacity-70">Balance del periodo</span>
        </div>
        <p className="text-2xl sm:text-4xl font-bold tracking-tight break-words">
          {formatMoney(totalIncome - totalExpense, currency)}
        </p>
        <div className="flex gap-3 sm:gap-6 mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs opacity-60">Ingresos</p>
              <p className="text-sm font-semibold">{formatMoney(totalIncome, currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-rose-500/20 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs opacity-60">Gastos</p>
              <p className="text-sm font-semibold">{formatMoney(totalExpense, currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-xs font-bold">%</span>
            </div>
            <div>
              <p className="text-xs opacity-60">Ahorro</p>
              <p className="text-sm font-semibold">{(summary?.savingsRate || 0).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats with Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ingresos</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 truncate">
              {formatMoney(totalIncome, currency)}
            </p>
            {comparison && (
              <ComparisonTag value={comparison.changes.income} />
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gastos</p>
            <p className="text-lg sm:text-xl font-bold text-rose-600 truncate">
              {formatMoney(totalExpense, currency)}
            </p>
            {comparison && (
              <ComparisonTag value={comparison.changes.expense} invertColor />
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Balance</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {formatMoney(totalIncome - totalExpense, currency)}
            </p>
            {comparison && (
              <ComparisonTag value={comparison.changes.balance} />
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Metas activas</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {activeGoals.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow Chart */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Flujo de caja - Ultimos 6 meses</h3>
          {!cashflow?.length ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cashflow}>
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
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Gastos por categoria</h3>
            {pieData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Sin datos</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {pieData.slice(0, 5).map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white min-w-0 truncate">{formatMoney(item.value, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 3 Expense Categories */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Donde va tu dinero</h3>
            {pieData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-4">
                {pieData.slice(0, 3).map((item, i) => {
                  const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatMoney(item.value, currency)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 ml-6">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 ml-6 mt-1">{pct.toFixed(1)}% del total</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Summary */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Metas de ahorro</h3>
              <Link href="/dashboard/goals" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Ver todas
              </Link>
            </div>
            {activeGoals.length === 0 ? (
              <div className="text-center py-6">
                <Target className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">Sin metas activas</p>
                <Link href="/dashboard/goals" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                  Crear meta
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.slice(0, 4).map((goal) => {
                  const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: goal.color || "#6366F1" }}
                          />
                          <span className="text-sm font-medium text-gray-700">{goal.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatMoney(goal.currentAmount, currency)}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatMoney(goal.targetAmount, currency)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 pb-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ultimos registros</h3>
            <Link href="/dashboard/transactions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Ver todo
            </Link>
          </div>
          <div className="mt-3">
            {!txData?.transactions?.length ? (
              <div className="text-center py-8">
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">Sin transacciones</p>
                <Link
                  href="/dashboard/transactions"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Agregar primera transaccion
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {txData.transactions.map((tx) => (
<div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-2">
                     <div className="flex items-center gap-3 min-w-0 flex-1">
                       <div
                         className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                         style={{ backgroundColor: tx.category?.color || "#6b7280" }}
                       >
                         {tx.category?.icon?.charAt(0)?.toUpperCase() || "$"}
                       </div>
                       <div className="min-w-0">
                         <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.title}</p>
                         <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                           {tx.category?.name} · {formatDate(tx.date)}
                         </p>
                       </div>
                     </div>
                     <span
                       className={`text-sm font-semibold shrink-0 ${
                         tx.type === "INCOME" ? "text-emerald-600" : "text-gray-900 dark:text-white"
                       }`}
                     >
                       {tx.type === "INCOME" ? "+" : "-"}{formatMoney(tx.amount, tx.currency || currency)}
                     </span>
                   </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
