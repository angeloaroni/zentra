"use client"

import { useState, useEffect, Suspense } from "react"
import { api, getUser } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Zap, Users, ArrowLeft, CreditCard, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface Subscription {
  id: string
  plan: string
  status: string
  stripeCustomerId?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

const PLANS = [
  {
    id: "free",
    name: "Gratis",
    price: "$0",
    period: "/mes",
    icon: Zap,
    description: "Para empezar a controlar tus finanzas",
    features: [
      "Hasta 50 transacciones/mes",
      "2 cuentas",
      "3 presupuestos",
      "3 metas de ahorro",
      "1 grupo de division (3 personas)",
      "10 gastos compartidos/mes",
      "Division igual solamente",
    ],
    color: "from-gray-500 to-gray-600",
    limits: { transactions: 50, accounts: 2, budgets: 3, goals: 3 },
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99",
    period: "/mes",
    icon: Crown,
    description: "Para personas que quieren control total",
    color: "from-blue-500 to-indigo-600",
    popular: true,
    features: [
      "Transacciones ilimitadas",
      "Cuentas ilimitadas",
      "Presupuestos ilimitados",
      "Metas ilimitadas",
      "Grupos de division ilimitados",
      "Division por % y monto exacto",
      "Gastos recurrentes compartidos",
      "Desglose de items por persona",
      "Conversion de monedas",
      "Guardar divisiones por defecto",
      "Exportar a CSV",
      "Alertas de presupuesto",
    ],
    limits: { transactions: -1, accounts: -1, budgets: -1, goals: -1 },
  },
  {
    id: "family",
    name: "Familia",
    price: "$7.99",
    period: "/mes",
    icon: Users,
    description: "Para familias que gestionan juntos",
    color: "from-purple-500 to-pink-600",
    features: [
      "Todo lo de Pro",
      "Hasta 6 miembros",
      "Datos compartidos en familia",
      "Roles (Admin / Miembro)",
      "Invitar por email o enlace",
      "Vista personal y familiar",
    ],
    limits: { transactions: -1, accounts: -1, budgets: -1, goals: -1 },
  },
]

const PRICE_MAP: Record<string, string> = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",
  family: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID || "",
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  family: "Familia",
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pro: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  family: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><p className="text-center text-muted-foreground py-8">Cargando...</p></div>}>
      <BillingContent />
    </Suspense>
  )
}

function BillingContent() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const { addToast } = useToast()
  const searchParams = useSearchParams()
  const user = getUser()

  useEffect(() => {
    api<Subscription>("/subscriptions")
      .then(setSubscription)
      .catch(() => {})

    const billingStatus = searchParams.get("billing")
    if (billingStatus === "success") {
      addToast({ title: "Suscripcion activada", description: "Tu plan ha sido actualizado exitosamente.", variant: "success" })
    } else if (billingStatus === "cancel") {
      addToast({ title: "Cancelado", description: "El proceso de suscripcion fue cancelado.", variant: "warning" })
    }
  }, [searchParams, addToast])

  const currentPlan = subscription?.plan || "free"

  async function handleSelect(planId: string) {
    if (planId === currentPlan) return

    if (planId === "free") {
      setLoading("free")
      try {
        const result = await api<Subscription>("/subscriptions", {
          method: "PATCH",
          body: JSON.stringify({ plan: "free" }),
        })
        setSubscription(result)
        addToast({ title: "Plan actualizado", description: "Has cambiado al plan Gratis.", variant: "success" })
      } catch (err: any) {
        addToast({ title: "Error", description: err.message, variant: "error" })
      }
      setLoading(null)
      return
    }

    const priceId = PRICE_MAP[planId]
    if (!priceId) {
      addToast({
        title: "Proximamente",
        description: "Los pagos con Stripe estan en configuracion. Contacta al equipo.",
        variant: "warning",
      })
      return
    }

    setLoading(planId)
    try {
      const result = await api<{ url?: string }>("/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      })
      if (result.url) window.location.href = result.url
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "error" })
    }
    setLoading(null)
  }

  async function handleManageBilling() {
    setLoading("portal")
    try {
      const result = await api<{ url?: string }>("/subscriptions/portal", {
        method: "POST",
      })
      if (result.url) window.location.href = result.url
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "error" })
    }
    setLoading(null)
  }

  async function handleCancel() {
    setLoading("cancel")
    try {
      const result = await api<Subscription>("/subscriptions/cancel", {
        method: "POST",
      })
      setSubscription(result)
      addToast({ title: "Suscripcion cancelada", description: "Tu plan se cancelara al final del periodo actual.", variant: "success" })
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "error" })
    }
    setLoading(null)
  }

  const currentPlanData = PLANS.find((p) => p.id === currentPlan) || PLANS[0]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Plan y facturacion</h1>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Plan actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${currentPlanData.color} flex items-center justify-center`}>
                <currentPlanData.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {PLAN_LABELS[currentPlan]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[currentPlan]}`}>
                    Activo
                  </span>
                </div>
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-gray-500">
                    {currentPlan !== "free"
                      ? `Proximo cobro: ${new Date(subscription.currentPeriodEnd).toLocaleDateString("es-ES")}`
                      : "Sin cobro"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {currentPlan !== "free" && subscription?.stripeCustomerId && (
                <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={loading === "portal"}>
                  <CreditCard className="h-4 w-4 mr-1" />
                  {loading === "portal" ? "Abriendo..." : "Gestionar pago"}
                </Button>
              )}
              {currentPlan !== "free" && !subscription?.cancelAtPeriodEnd && (
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading === "cancel"} className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950">
                  {loading === "cancel" ? "Cancelando..." : "Cancelar suscripcion"}
                </Button>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Se cancelara al final del periodo
                </div>
              )}
            </div>
          </div>

          {currentPlanData.limits.transactions > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Limites del plan Gratis:</strong> {currentPlanData.limits.transactions} transacciones/mes, {currentPlanData.limits.accounts} cuentas, {currentPlanData.limits.budgets} presupuestos, {currentPlanData.limits.goals} metas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cambiar plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isCurrent = currentPlan === plan.id
            const isDowngrade = plan.id === "free" && currentPlan !== "free"
            const isUpgrade = !isCurrent && !isDowngrade

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-5 flex flex-col ${
                  isCurrent
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                    : plan.popular
                    ? "border-blue-500/30 dark:border-blue-400/30"
                    : "border-gray-200 dark:border-gray-700"
                } bg-white dark:bg-gray-900`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Popular
                  </div>
                )}

                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <div className="mt-1 mb-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={loading === plan.id || isCurrent}
                  className={`w-full py-2.5 px-3 rounded-xl font-medium text-sm transition-all ${
                    isCurrent
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default"
                      : isDowngrade
                      ? "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-400 hover:text-red-600"
                      : plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                  }`}
                >
                  {loading === plan.id
                    ? "Procesando..."
                    : isCurrent
                    ? "Plan actual"
                    : isDowngrade
                    ? "Cambiar a Gratis"
                    : "Suscribirse"}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}