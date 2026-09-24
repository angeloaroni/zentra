"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useSettings, getCurrencySymbol } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { useToast } from "@/components/ui/toast"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

interface Category {
  id: string
  name: string
  type: string
}

interface Account {
  id: string
  name: string
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

export function QuickAddTransaction() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE")
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [accountId, setAccountId] = useState("")
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState("")

  const { currency } = useSettings()
  const { activeFamilyId } = useFamilyStore()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories", activeFamilyId],
    queryFn: () => {
      const params = new URLSearchParams({ includeDefault: "true" })
      if (activeFamilyId) params.set("familyId", activeFamilyId)
      return api(`/categories?${params}`)
    },
    enabled: open,
  })

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["accounts", activeFamilyId],
    queryFn: () => {
      const params = activeFamilyId ? `?familyId=${activeFamilyId}` : ""
      return api(`/accounts${params}`)
    },
    enabled: open,
  })

  const filteredCategories = (categories || []).filter((c) =>
    type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE"
  )

  function reset() {
    setOpen(false)
    setError("")
    setTitle("")
    setAmount("")
    setCategoryId("")
    setAccountId("")
    setDate(todayISO())
    setType("EXPENSE")
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => api("/transactions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      queryClient.invalidateQueries({ queryKey: ["net-worth"] })
      addToast({ title: "Transaccion creada", variant: "success" })
      reset()
    },
    onError: (err: Error) => setError(err.message),
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!title.trim()) {
      setError("El titulo es requerido")
      return
    }
    const amt = parseFloat(amount)
    if (!amount || amt <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }
    if (!categoryId) {
      setError("Selecciona una categoria")
      return
    }
    createMutation.mutate({
      type,
      title: title.trim(),
      amount: amt,
      currency,
      date,
      categoryId,
      ...(accountId && { accountId }),
      familyId: activeFamilyId ? activeFamilyId : null,
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
        aria-label="Anadir transaccion (atajo: N)"
        title="Anadir transaccion (N)"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      <Modal open={open} onClose={reset} title="Anadir transaccion" maxWidth="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType("EXPENSE")
                setCategoryId("")
              }}
              className={cn(
                "min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
                type === "EXPENSE"
                  ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              )}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                setType("INCOME")
                setCategoryId("")
              }}
              className={cn(
                "min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
                type === "INCOME"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              )}
            >
              Ingreso
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-title" className="text-xs">Titulo</Label>
            <Input
              id="qa-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Supermercado"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-amount" className="text-xs">Monto ({getCurrencySymbol(currency)})</Label>
              <Input
                id="qa-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-date" className="text-xs">Fecha</Label>
              <Input id="qa-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-category" className="text-xs">Categoria</Label>
            <select
              id="qa-category"
              className={selectClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Seleccionar categoria</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {accounts && accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="qa-account" className="text-xs">Cuenta (opcional)</Label>
              <select
                id="qa-account"
                className={selectClass}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Sin cuenta</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <Button type="submit" className="min-h-[44px] w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </Modal>
    </>
  )
}
