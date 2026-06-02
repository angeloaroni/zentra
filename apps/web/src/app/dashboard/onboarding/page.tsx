"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, ArrowLeftRight, PiggyBank, Target, Check } from "lucide-react"

const STEPS = [
  {
    id: "welcome",
    title: "Bienvenido a Zentra",
    subtitle: "Vamos a configurar tu experiencia en 3 pasos rapidos",
    icon: Wallet,
  },
  {
    id: "account",
    title: "Crea tu primera cartera",
    subtitle: "Las carteras te ayudan a organizar tu dinero (efectivo, banco, ahorros)",
    icon: Wallet,
  },
  {
    id: "transaction",
    title: "Registra tu primer movimiento",
    subtitle: "Agrega un ingreso o gasto para empezar a ver tus finanzas en accion",
    icon: ArrowLeftRight,
  },
  {
    id: "done",
    title: "Todo listo",
    subtitle: "Ya puedes empezar a gestionar tus finanzas con Zentra",
    icon: Check,
  },
]

const ACCOUNT_TYPES = [
  { value: "cash", label: "Efectivo", icon: "💵" },
  { value: "checking", label: "Cuenta bancaria", icon: "🏦" },
  { value: "savings", label: "Ahorros", icon: "piggy" },
  { value: "investment", label: "Inversiones", icon: "📈" },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [accountName, setAccountName] = useState("")
  const [accountType, setAccountType] = useState("checking")
  const [accountBalance, setAccountBalance] = useState("")
  const [txTitle, setTxTitle] = useState("")
  const [txAmount, setTxAmount] = useState("")
  const [txType, setTxType] = useState("INCOME")
  const [error, setError] = useState("")
  const router = useRouter()

  const createAccount = useMutation({
    mutationFn: (data: { name: string; type: string; balance: number }) =>
      api("/accounts", { method: "POST", body: JSON.stringify(data) }),
  })

  const createTransaction = useMutation({
    mutationFn: (data: { title: string; amount: number; type: string; categoryId: string; date: string; familyId?: string | null }) =>
      api("/transactions", { method: "POST", body: JSON.stringify(data) }),
  })

  async function handleAccount() {
    setError("")
    if (!accountName.trim()) {
      setError("El nombre es requerido")
      return
    }
    try {
      await createAccount.mutateAsync({
        name: accountName.trim(),
        type: accountType,
        balance: accountBalance ? parseFloat(accountBalance) : 0,
      })
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleTransaction() {
    setError("")
    if (!txTitle.trim() || !txAmount) {
      setError("Completa los campos")
      return
    }
    try {
      const categories = await api<{ id: string; name: string }[]>("/categories")
      const category = categories.find((c: any) =>
        txType === "INCOME" ? c.name.toLowerCase().includes("salario") || c.name.toLowerCase().includes("income") : c.name.toLowerCase().includes("aliment") || c.name.toLowerCase().includes("food")
      ) || categories[0]

      await createTransaction.mutateAsync({
        title: txTitle.trim(),
        amount: parseFloat(txAmount),
        type: txType,
        categoryId: category.id,
        date: new Date().toISOString().split("T")[0],
        familyId: null,
      })
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{currentStep.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{currentStep.subtitle}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i <= step ? "bg-blue-600 w-8" : "bg-gray-200 dark:bg-gray-700 w-2"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {step === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                {[
                  { icon: Wallet, text: "Organiza tus cuentas y saldo" },
                  { icon: ArrowLeftRight, text: "Registra ingresos y gastos" },
                  { icon: PiggyBank, text: "Crea presupuestos y cumple tus metas" },
                  { icon: Target, text: "Sigueno tu progreso con graficos" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-6" onClick={() => setStep(1)}>
                Comenzar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Tipo de cartera</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ACCOUNT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setAccountType(t.value)}
                      className={`p-3 rounded-xl border-2 text-sm text-left transition-all ${
                        accountType === t.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <span className="text-lg">{t.icon === "piggy" ? "🐷" : t.icon}</span>
                      <p className="mt-1 font-medium">{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Nombre</Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ej: Mi cuenta bancaria"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Saldo inicial (opcional)</Label>
                <Input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  <ArrowLeftRight className="h-4 w-4 mr-1" />
                  Atras
                </Button>
                <Button onClick={handleAccount} disabled={createAccount.isPending} className="flex-1">
                  {createAccount.isPending ? "Creando..." : "Crear cartera"}
                </Button>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-center"
              >
                Saltar este paso
              </button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTxType("INCOME")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    txType === "INCOME"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500"
                      : "border-2 border-gray-200 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  Ingreso
                </button>
                <button
                  onClick={() => setTxType("EXPENSE")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    txType === "EXPENSE"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-2 border-red-500"
                      : "border-2 border-gray-200 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  Gasto
                </button>
              </div>
              <div>
                <Label>Descripcion</Label>
                <Input
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  placeholder={txType === "INCOME" ? "Ej: Salario mensual" : "Ej: Supermercado"}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Atras
                </Button>
                <Button onClick={handleTransaction} disabled={createTransaction.isPending} className="flex-1">
                  {createTransaction.isPending ? "Guardando..." : "Registrar"}
                </Button>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-center"
              >
                Saltar este paso
              </button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Tu panel de control esta listo. Puedes agregar mas carteras, presupuestos, metas y eventos desde el menu.
              </p>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Ir a mi panel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}