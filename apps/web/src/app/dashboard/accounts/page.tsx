"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useSettings, getCurrencySymbol, formatMoney, useHasHydrated, useMounted } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Skeleton, SkeletonAccountCard } from "@/components/ui/skeleton"
import { ConfirmAction } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, CreditCard, Landmark, Banknote, Pencil, Wallet } from "lucide-react"

interface Account {
  id: string
  name: string
  type: string
  icon: string
  color: string
  balance: number
  currency: string
}

const ACCOUNT_TYPES = [
  { value: "checking", label: "Cuenta corriente", icon: Landmark },
  { value: "savings", label: "Ahorro", icon: Wallet },
  { value: "credit", label: "Tarjeta de credito", icon: CreditCard },
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "investment", label: "Inversiones", icon: Wallet },
]

const PRESET_COLORS = [
  "#6366F1", "#10B981", "#3B82F6", "#EF4444",
  "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6",
]

function getAccountIcon(type: string) {
  const t = ACCOUNT_TYPES.find((a) => a.value === type)
  const Icon = t?.icon || Wallet
  return <Icon className="h-5 w-5" />
}

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const { activeFamilyId } = useFamilyStore()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState("")

  const defaultForm = { name: "", type: "checking", balance: "", color: PRESET_COLORS[0] }
  const [form, setForm] = useState(defaultForm)

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["accounts", activeFamilyId],
    queryFn: () => {
      const params = activeFamilyId ? `?familyId=${activeFamilyId}` : ""
      return api(`/accounts${params}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api("/accounts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      setShowForm(false)
      setFormError("")
      setForm(defaultForm)
      addToast({ title: "Cuenta creada", variant: "success" })
    },
    onError: (err: Error) => {
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      setDeleteId(null)
      addToast({ title: "Cuenta eliminada", variant: "success" })
    },
    onError: (err: Error) => {
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      setEditingId(null)
      setShowForm(false)
      setFormError("")
      setForm(defaultForm)
      addToast({ title: "Cuenta actualizada", variant: "success" })
    },
    onError: (err: Error) => {
      addToast({ title: "Error", description: err.message || "Error al actualizar", variant: "error" })
    },
  })

  function startEdit(acc: Account) {
    setEditingId(acc.id)
    setShowForm(true)
    setFormError("")
    setForm({
      name: acc.name,
      type: acc.type,
      balance: String(acc.balance),
      color: acc.color || PRESET_COLORS[0],
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!form.name.trim()) {
      setFormError("El nombre es requerido")
      return
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name: form.name.trim(),
          type: form.type,
          balance: parseFloat(form.balance) || 0,
          currency,
          color: form.color,
        },
      })
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        type: form.type,
        balance: parseFloat(form.balance) || 0,
        currency,
        color: form.color,
        familyId: activeFamilyId ? activeFamilyId : null,
      })
    }
  }

  const totalBalance = (accounts || []).reduce((s, a) => s + a.balance, 0)

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonAccountCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">Cuentas</h1>
        <Button onClick={() => { setShowForm(!showForm); setFormError(""); setEditingId(null); setForm(defaultForm) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Button>
      </div>

      <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20">
        <CardContent className="p-6">
          <p className="text-sm opacity-80">Balance total</p>
          <p className="text-2xl sm:text-3xl font-bold">{formatMoney(totalBalance, currency)}</p>
          <p className="text-sm opacity-60 mt-1">{accounts?.length || 0} cuenta(s)</p>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Editar cuenta" : "Nueva cuenta"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej: Banco principal"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{editingId ? "Balance" : "Balance inicial"} ({getCurrencySymbol(currency)})</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.balance}
                  onChange={(e) => setForm(prev => ({ ...prev, balance: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        form.color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm(prev => ({ ...prev, color: c }))}
                    />
                  ))}
                </div>
              </div>

              {formError && (
                <div className="md:col-span-2">
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">{formError}</p>
                </div>
              )}

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={editingId ? updateMutation.isPending : createMutation.isPending}>
                  {editingId
                    ? (updateMutation.isPending ? "Actualizando..." : "Actualizar")
                    : (createMutation.isPending ? "Guardando..." : "Guardar")}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormError(""); setEditingId(null); setForm(defaultForm) }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      ) : !accounts?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sin cuentas</p>
            <p className="text-sm text-muted-foreground mt-1">Crea tu primera cuenta para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} className="overflow-hidden">
              <div className="h-2" style={{ backgroundColor: acc.color }} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: acc.color }}
                    >
                      {getAccountIcon(acc.type)}
                    </div>
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(acc)}
                      className="text-muted-foreground hover:text-blue-500 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(acc.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-bold mt-3">
                  {formatMoney(acc.balance, acc.currency || currency)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmAction
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Eliminar cuenta"
        description="Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}