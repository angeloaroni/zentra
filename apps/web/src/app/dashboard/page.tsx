"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, getUser } from "@/lib/api"
import { useSettings, formatMoney, formatDateShort, formatMonthYear, useHasHydrated } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/fade-in"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from "lucide-react"
import Link from "next/link"
const CashflowChart = dynamic(() => import("./components/CashflowChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />,
})
const CategoryChart = dynamic(() => import("./components/CategoryChart"), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />,
})
const NetWorthChart = dynamic(() => import("./components/NetWorthChart"), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />,
})

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
  name: string
  color: string
  icon: string
  amount: number
  count: number
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

  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    setUser(getUser())
    setMounted(true)
    const now = new Date()
    setDateRange({
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
    })
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Close any open modals (handled by individual components)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const familyParam = activeFamilyId ? `?familyId=${activeFamilyId}` : ""

  const { data: overview, isLoading: overviewLoading } = useQuery<{
    summary: { totalIncome: number; totalExpense: number; balance: number; savingsRate: number }
    recentTransactions: Transaction[]
    byCategory: CategoryBreakdown[]
    goals: Goal[]
    comparison: Comparison
    cashflow: CashflowItem[]
  }>({
    queryKey: ["dashboard-overview", activeFamilyId, dateRange.startDate, dateRange.endDate],
    queryFn: () => api(`/transactions/overview?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${familyParam}`),
    enabled: !!dateRange.startDate,
    staleTime: 60_000,
  })

  const summary = overview?.summary
  const txData = overview?.recentTransactions ? { transactions: overview.recentTransactions } : undefined
  const byCategory = overview?.byCategory
  const goals = overview?.goals
  const comparison = overview?.comparison
  const cashflow = overview?.cashflow

  const { data: netWorth } = useQuery<{ date: string; balance: number }[]>({
    queryKey: ["net-worth"],
    queryFn: () => api("/net-worth?months=12"),
    staleTime: 300_000,
  })

  const { data: insights } = useQuery<{ type: string; title: string; message: string; icon: string }[]>({
    queryKey: ["insights"],
    queryFn: () => api("/insights"),
    staleTime: 300_000,
  })

  const { data: healthScore } = useQuery<{ score: number; label: string; breakdown: Record<string, { score: number; max: number; description: string }> }>({
    queryKey: ["health-score"],
    queryFn: () => api("/health-score"),
    staleTime: 300_000,
  })

  const pieData = (byCategory || []).map((item, i) => ({
    name: item.name || "Otro",
    value: item.amount,
    color: item.color || COLORS[i % COLORS.length],
  }))

  const totalIncome = summary?.totalIncome || 0
  const totalExpense = summary?.totalExpense || 0
  const activeGoals = (goals || []).filter(g => g.currentAmount < g.targetAmount)

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Hola, {mounted ? (user?.name || "Usuario") : "..."}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {activeFamilyId
              ? `Vista familiar · ${formatMonthYear(new Date(dateRange.startDate))}`
              : formatMonthYear(new Date(dateRange.startDate))
            }
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (!overview) return
            const rows = [
              ["Metrica", "Valor"],
              ["Ingresos", overview.summary.totalIncome],
              ["Gastos", overview.summary.totalExpense],
              ["Balance", overview.summary.balance],
              ["Tasa de ahorro", `${overview.summary.savingsRate.toFixed(1)}%`],
              [],
              ["Categoria", "Monto", "Transacciones"],
              ...overview.byCategory.map(c => [c.name, c.amount, c.count]),
            ]
            const csv = rows.map(r => r.join(",")).join("\n")
            const blob = new Blob([csv], { type: "text/csv" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `zentra-resumen-${new Date().toISOString().split("T")[0]}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }} className="hidden sm:flex h-9">
            <Download className="h-4 w-4 mr-1" />Exportar
          </Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
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
            <CashflowChart data={cashflow} formatMoney={formatMoney} currency={currency} />
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Gastos por categoria</h3>
            <CategoryChart data={pieData} formatMoney={formatMoney} currency={currency} />
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

      {/* Health Score */}
      {healthScore && (
        <FadeIn>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Salud financiera</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-bold ${
                      healthScore.score >= 80 ? "text-emerald-600" :
                      healthScore.score >= 60 ? "text-blue-600" :
                      healthScore.score >= 40 ? "text-amber-600" : "text-red-600"
                    }`}>{healthScore.score}</span>
                    <span className="text-sm text-gray-400">/100</span>
                    <span className={`text-sm font-medium ${
                      healthScore.score >= 80 ? "text-emerald-600" :
                      healthScore.score >= 60 ? "text-blue-600" :
                      healthScore.score >= 40 ? "text-amber-600" : "text-red-600"
                    }`}>{healthScore.label}</span>
                  </div>
                </div>
                <div className="h-16 w-16 relative">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-200 dark:text-gray-700" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className={
                      healthScore.score >= 80 ? "text-emerald-500" :
                      healthScore.score >= 60 ? "text-blue-500" :
                      healthScore.score >= 40 ? "text-amber-500" : "text-red-500"
                    } stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${healthScore.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <FadeIn>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.slice(0, 4).map((insight, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{insight.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Net Worth Chart */}
      {netWorth && netWorth.length > 1 && (
        <FadeIn>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Patrimonio neto</h3>
              <NetWorthChart data={netWorth} formatMoney={formatMoney} currency={currency} />
            </CardContent>
          </Card>
        </FadeIn>
      )}

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
                          tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"
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
