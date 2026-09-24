"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { api, getUser } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { useSettings, formatMoney, formatDateShort, formatMonthYear, useHasHydrated } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { escapeCSV } from "@/lib/format"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/fade-in"
import { Skeleton } from "@/components/ui/skeleton"
import { LockedPreview } from "@/components/ui/locked-preview"
import { Modal } from "@/components/ui/modal"
import { useDashboardPrefs, DASHBOARD_WIDGETS } from "@/lib/dashboard-prefs"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Crown,
  SlidersHorizontal,
  Mail,
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

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
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
  const { addToast } = useToast()
  const [user, setUser] = useState<{ id: string; name: string; email: string; role?: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)
  const { hidden, toggle: toggleWidget } = useDashboardPrefs()
  const [showCustomize, setShowCustomize] = useState(false)
  const isHidden = (id: string) => hidden.includes(id)

  const sendSummary = useMutation({
    mutationFn: () => api<{ message?: string }>("/reports/monthly-digest/send", { method: "POST" }),
    onSuccess: (res) => addToast({ title: "Resumen enviado", description: res?.message, variant: "success" }),
    onError: (err: Error) => addToast({ title: "Error", description: err.message, variant: "error" }),
  })

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

  const familyParam = activeFamilyId ? `&familyId=${activeFamilyId}` : ""

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

  const { data: netWorth, isError: netWorthError } = useQuery<{ date: string; balance: number }[]>({
    queryKey: ["net-worth"],
    queryFn: () => api("/net-worth?months=12"),
    staleTime: 300_000,
  })

  const { data: insights, isError: insightsError } = useQuery<{ type: string; title: string; message: string; icon: string }[]>({
    queryKey: ["insights"],
    queryFn: () => api("/insights"),
    staleTime: 300_000,
  })

  const { data: healthScore, isError: healthError } = useQuery<{ score: number; label: string; breakdown: Record<string, { score: number; max: number; description: string }> }>({
    queryKey: ["health-score"],
    queryFn: () => api("/health-score"),
    staleTime: 300_000,
  })

  useEffect(() => {
    if (healthScore?.score) {
      let start = 0
      const end = healthScore.score
      const duration = 1000
      const increment = end / (duration / 16)
      const timer = setInterval(() => {
        start += increment
        if (start >= end) {
          setAnimatedScore(end)
          clearInterval(timer)
        } else {
          setAnimatedScore(Math.floor(start))
        }
      }, 16)
      return () => clearInterval(timer)
    }
  }, [healthScore?.score])

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["accounts", activeFamilyId],
    queryFn: () => {
      const params = activeFamilyId ? `?familyId=${activeFamilyId}` : ""
      return api(`/accounts${params}`)
    },
    staleTime: 300_000,
  })

  const { data: overallBalance } = useQuery<{ owedToUser: number; userOwes: number; people?: Array<{ id: string; name: string; amount: number }> }>({
    queryKey: ["overall-balance"],
    queryFn: () => api("/splits/groups/balances/overall"),
    staleTime: 300_000,
  })

  const { data: upcoming } = useQuery<Array<{
    id: string
    title: string
    amount: number
    type: string
    nextDate: string
    category?: { name: string; color: string; icon: string }
  }>>({
    queryKey: ["upcoming", activeFamilyId],
    queryFn: () => api(`/transactions/upcoming${activeFamilyId ? `?familyId=${activeFamilyId}` : ""}`),
    staleTime: 300_000,
  })

  const { data: subscription } = useQuery<{ plan: string; trialEndsAt?: string }>({
    queryKey: ["subscription"],
    queryFn: () => api("/subscriptions"),
  })
  const isTrialActive = !!(subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > new Date())
  const trialDaysLeft = isTrialActive
    ? Math.ceil((new Date(subscription!.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  const TRIAL_TOTAL_DAYS = 14
  const trialProgress = isTrialActive
    ? Math.min(100, Math.round(((TRIAL_TOTAL_DAYS - trialDaysLeft) / TRIAL_TOTAL_DAYS) * 100))
    : 0
  const trialUrgent = isTrialActive && trialDaysLeft <= 3

  const pieData = (byCategory || []).map((item, i) => ({
    name: item.name || "Otro",
    value: item.amount,
    color: item.color || COLORS[i % COLORS.length],
  }))

  const totalIncome = summary?.totalIncome || 0
  const totalExpense = summary?.totalExpense || 0
  const activeGoals = (goals || []).filter(g => g.currentAmount < g.targetAmount)
  const visibleChartCount = ["categoryChart", "topCategories", "goals"].filter((id) => !isHidden(id)).length

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

  if (overviewLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-[140px] w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
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
          <p className="text-muted-foreground text-sm mt-0.5">
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
              ...overview.byCategory.map(c => [escapeCSV(c.name), c.amount, c.count]),
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
          <Button variant="outline" size="sm" onClick={() => sendSummary.mutate()} disabled={sendSummary.isPending} className="hidden sm:flex h-9" aria-label="Enviar resumen mensual por email">
            <Mail className="h-4 w-4 mr-1" />{sendSummary.isPending ? "Enviando..." : "Resumen"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCustomize(true)} className="hidden sm:flex h-9" aria-label="Personalizar panel">
            <SlidersHorizontal className="h-4 w-4 mr-1" />Personalizar
          </Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {isTrialActive && (
        <div
          className={`rounded-xl p-4 text-white shadow-lg ${
            trialUrgent
              ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-rose-500/20"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Crown className="h-5 w-5 text-amber-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold">
                  {trialUrgent
                    ? `Ultimos ${trialDaysLeft} dias de Pro`
                    : `Pro (trial) — ${trialDaysLeft} dias restantes`}
                </p>
                <p className={`text-sm ${trialUrgent ? "text-white/90" : "text-blue-100"}`}>
                  Disfruta de todas las funciones Pro gratis.
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings/billing">
              <Button variant="secondary" size="sm" className="min-h-[44px] bg-white/20 hover:bg-white/30 text-white border-0 shrink-0">
                Aprovecha Pro ahora
              </Button>
            </Link>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${trialProgress}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Presupuestos", "Metas", "Eventos", "Dividir"].map((benefit) => (
                <span key={benefit} className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Balance de cuentas */}
      {accounts && accounts.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Balance total cuentas</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {formatMoney(accounts.reduce((s, a) => s + a.balance, 0), currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{accounts.length} cuenta(s)</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats with Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
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
            <p className="text-xs text-muted-foreground mb-1">Gastos</p>
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
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
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
            <p className="text-xs text-muted-foreground mb-1">Metas activas</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {activeGoals.length}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatMoney(activeGoals.reduce((s, g) => s + g.currentAmount, 0), currency)} ahorrado
            </p>
          </CardContent>
        </Card>
      </div>

      {!isHidden("upcoming") && upcoming && upcoming.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Proximos pagos</h3>
              <Link href="/dashboard/transactions" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Ver recurrentes
              </Link>
            </div>
            <div className="space-y-3">
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                      style={{ backgroundColor: item.category?.color || "#6b7280" }}
                    >
                      {item.category?.icon?.charAt(0)?.toUpperCase() || "$"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateShort(item.nextDate)}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      item.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {item.type === "INCOME" ? "+" : "-"}
                    {formatMoney(item.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cashflow Chart */}
      {!isHidden("cashflow") && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Flujo de caja - Ultimos 6 meses</h3>
            {!cashflow?.length ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sin datos</p>
            ) : (
              <CashflowChart data={cashflow} formatMoney={formatMoney} currency={currency} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className={cn("grid grid-cols-1 gap-6", visibleChartCount === 3 ? "lg:grid-cols-3" : visibleChartCount === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
        {/* Category Breakdown */}
        {!isHidden("categoryChart") && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Gastos por categoria</h3>
              <CategoryChart data={pieData} formatMoney={formatMoney} currency={currency} />
            </CardContent>
          </Card>
        )}

        {/* Top 3 Expense Categories */}
        {!isHidden("topCategories") && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Donde va tu dinero</h3>
              {pieData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-4">
                  {pieData.slice(0, 3).map((item, i) => {
                    const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
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
                        <p className="text-xs text-muted-foreground ml-6 mt-1">{pct.toFixed(1)}% del total</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Goals Summary */}
        {!isHidden("goals") && (
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
                  <p className="text-muted-foreground text-sm">Sin metas activas</p>
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
                           <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                         <div className="w-full bg-gray-100 rounded-full h-2">
                           <div
                             className="h-2 rounded-full transition-all"
                             style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goal.color || "#3B82F6" }}
                           />
                         </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{formatMoney(goal.currentAmount, currency)}</span>
                           <span className="text-xs text-muted-foreground">{formatMoney(goal.targetAmount, currency)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Health Score */}
      {!isHidden("health") && healthError && (
        <LockedPreview
          title="Salud financiera"
          description="Mira tu score 0-100 y como mejorarlo."
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Salud financiera</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-emerald-600">82</span>
                    <span className="text-sm text-gray-400">/100</span>
                    <span className="text-sm font-medium text-emerald-600">Excelente</span>
                  </div>
                </div>
                <div className="h-16 w-16 relative">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-200 dark:text-gray-700" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="82, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </LockedPreview>
      )}
      {!isHidden("health") && healthScore && (
        <FadeIn>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm text-muted-foreground">Salud financiera</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-bold ${
                      healthScore.score >= 80 ? "text-emerald-600" :
                      healthScore.score >= 60 ? "text-blue-600" :
                      healthScore.score >= 40 ? "text-amber-600" : "text-red-600"
                    }`}>{animatedScore}</span>
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
                    } stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${animatedScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {!isHidden("splits") && overallBalance && (overallBalance.owedToUser > 0 || overallBalance.userOwes > 0) && (
        <FadeIn>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                   <p className="text-sm text-muted-foreground">Division de gastos</p>
                  <div className="mt-2 space-y-1.5">
                    {overallBalance.people && overallBalance.people.filter((p: any) => p.amount > 0).length > 0 && (
                      <div>
                        <span className="text-[11px] text-emerald-600/70 uppercase tracking-wide">Te deben</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {overallBalance.people.filter((p: any) => p.amount > 0).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                              <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                                {p.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{p.name}</span>
                              <span className="text-xs font-bold text-emerald-600">{formatMoney(p.amount, currency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {overallBalance.people && overallBalance.people.filter((p: any) => p.amount < 0).length > 0 && (
                      <div>
                        <span className="text-[11px] text-red-600/70 uppercase tracking-wide">Debes</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {overallBalance.people.filter((p: any) => p.amount < 0).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20">
                              <div className="h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-[10px] font-medium">
                                {p.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-red-700 dark:text-red-300">{p.name}</span>
                              <span className="text-xs font-bold text-red-600">{formatMoney(Math.abs(p.amount), currency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!overallBalance.people || overallBalance.people.length === 0) && (
                      <div className="flex items-center gap-4">
                        {overallBalance.owedToUser > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-emerald-600">Te deben</span>
                            <span className="font-bold text-emerald-600">{formatMoney(overallBalance.owedToUser, currency)}</span>
                          </div>
                        )}
                        {overallBalance.userOwes > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600">Debes</span>
                            <span className="font-bold text-red-600">{formatMoney(overallBalance.userOwes, currency)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/dashboard/splits" className="text-sm text-blue-600 hover:text-blue-700 shrink-0 ml-3">
                  Ver grupos
                </Link>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Insights */}
      {!isHidden("insights") && insightsError && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Insights</h3>
          <LockedPreview
            title="Insights inteligentes"
            description="Detecta anomalias de gasto y tendencias."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg" aria-hidden="true">📈</span>
                    <div>
                      <p className="font-medium text-sm">Gasto en Ocio +34%</p>
                      <p className="text-xs text-gray-500 mt-1">Has gastado mas que el mes pasado.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg" aria-hidden="true">💡</span>
                    <div>
                      <p className="font-medium text-sm">Ahorro proyectado</p>
                      <p className="text-xs text-gray-500 mt-1">A este ritmo ahorraras 240 € este mes.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </LockedPreview>
        </div>
      )}
      {!isHidden("insights") && insights && insights.length > 0 && (
        <FadeIn>
          <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.slice(0, 4).map((insight, i) => {
                const iconMap: Record<string, string> = {
                  "trending-up": "📈",
                  "trending-down": "📉",
                  "alert": "⚠️",
                  "info": "ℹ️",
                }
                const emoji = iconMap[insight.icon] || "💡"
                return (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{emoji}</span>
                        <div>
                          <p className="font-medium text-sm">{insight.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{insight.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Net Worth Chart */}
      {!isHidden("netWorth") && netWorthError && (
        <LockedPreview
          title="Patrimonio neto"
          description="Sigue la evolucion de tu balance en el tiempo."
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Patrimonio neto</h3>
              <svg viewBox="0 0 300 80" className="h-[120px] w-full" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 L40,52 L80,55 L120,40 L160,44 L200,28 L240,32 L280,18 L300,22 L300,80 L0,80 Z"
                  fill="url(#nwFill)"
                />
                <path
                  d="M0,60 L40,52 L80,55 L120,40 L160,44 L200,28 L240,32 L280,18 L300,22"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                />
              </svg>
            </CardContent>
          </Card>
        </LockedPreview>
      )}
      {!isHidden("netWorth") && netWorth && netWorth.length > 1 && (
        <FadeIn>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
               <h3 className="text-sm font-medium text-muted-foreground mb-4">Patrimonio neto</h3>
              <NetWorthChart data={netWorth} formatMoney={formatMoney} currency={currency} />
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Recent Transactions */}
      {!isHidden("recent") && (
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
                  <p className="text-muted-foreground text-sm mb-3">Sin transacciones</p>
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
                    <p className="text-xs text-muted-foreground truncate">
                              {tx.category?.name} · {formatDate(tx.date)}
                            </p>
                         </div>
                       </div>
                        <span
                          className={`text-sm font-semibold shrink-0 ${
                            tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                         {tx.type === "INCOME" ? "+" : "-"}{formatMoney(tx.amount, currency)}
                       </span>
                     </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={showCustomize} onClose={() => setShowCustomize(false)} title="Personalizar panel" maxWidth="sm:max-w-md">
        <div className="space-y-1 p-4 sm:p-5">
          <p className="mb-2 text-sm text-muted-foreground">Elige que tarjetas quieres ver en tu panel.</p>
          {DASHBOARD_WIDGETS.map((widget) => (
            <label key={widget.id} className="flex cursor-pointer items-center justify-between gap-3 py-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">{widget.label}</span>
              <input
                type="checkbox"
                checked={!isHidden(widget.id)}
                onChange={() => toggleWidget(widget.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  )
}
