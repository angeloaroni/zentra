"use client"

import { useState, useEffect } from "react"
import { api, getUser } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Check, Zap, Users, Crown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const PLANS = [
  {
    id: "free",
    name: "Gratis",
    price: "$0",
    period: "/mes",
    description: "Para empezar a controlar tus finanzas",
    icon: Zap,
    features: [
      "Hasta 50 transacciones/mes",
      "2 cuentas",
      "3 presupuestos",
      "3 metas de ahorro",
      "Categorias predeterminadas",
      "Vista personal (sin familia)",
    ],
    color: "from-gray-500 to-gray-600",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99",
    period: "/mes",
    description: "Para personas que quieren control total",
    icon: Crown,
    popular: true,
    features: [
      "Transacciones ilimitadas",
      "Cuentas ilimitadas",
      "Presupuestos ilimitados",
      "Metas ilimitadas",
      "Eventos/tags con presupuestos",
      "Exportar a CSV",
      "Vista personal avanzada",
      "Recordatorios de presupuestos",
    ],
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "family",
    name: "Familia",
    price: "$7.99",
    period: "/mes",
    description: "Para familias que gestionan juntos",
    icon: Users,
    features: [
      "Todo lo de Pro",
      "Hasta 6 miembros",
      "Datos compartidos en familia",
      "Roles (Admin / Miembro)",
      "Invitar por email o enlace",
      "Vista personal y familiar",
      "Presupuestos familiares",
      "Metas familiares",
    ],
    color: "from-purple-500 to-pink-600",
  },
]

const PRICE_MAP: Record<string, string> = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",
  family: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID || "",
}

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("free")
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const { addToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u) {
      api<{ plan: string }>("/subscriptions")
        .then((sub) => setCurrentPlan(sub.plan))
        .catch(() => {})
    }
  }, [])

  async function handleSelect(planId: string) {
    if (!user) {
      router.push("/login")
      return
    }
    if (planId === currentPlan) return

    if (planId === "free") {
      setLoading(planId)
      try {
        await api("/subscriptions", {
          method: "PATCH",
          body: JSON.stringify({ plan: "free" }),
        })
        setCurrentPlan("free")
        addToast({ title: "Plan actualizado", description: "Cambiaraste al plan Gratis", variant: "success" })
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-gray-900 dark:text-white mb-3">
            Elige tu plan
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Comienza gratis y escala cuando lo necesites
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isCurrent = currentPlan === plan.id
            const isDowngrade = plan.id === "free" && currentPlan !== "free"

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                  plan.popular
                    ? "border-blue-500 dark:border-blue-400 shadow-xl shadow-blue-500/10"
                    : "border-gray-200 dark:border-gray-700"
                } ${isCurrent ? "bg-blue-50 dark:bg-blue-950/30" : "bg-white dark:bg-gray-900"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Mas popular
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Plan actual
                  </div>
                )}

                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={loading === plan.id || isCurrent}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                    isCurrent
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default"
                      : isDowngrade
                      ? "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-400 hover:text-red-600"
                      : plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                  }`}
                >
                  {loading === plan.id
                    ? "Procesando..."
                    : isCurrent
                    ? "Plan actual"
                    : isDowngrade
                    ? "Cambiar a Gratis"
                    : plan.price === "$0"
                    ? "Comenzar gratis"
                    : "Suscribirse"}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Todos los planes incluyen conexion segura, modo oscuro y exportacion CSV.
          </p>
          {user && (
            <Link
              href="/dashboard/settings"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
            >
              Volver a configuracion
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}