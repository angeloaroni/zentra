"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useFamilyStore } from "@/lib/family"
import { useSettings, getCurrencySymbol, formatMoney, formatMonthShort, useHasHydrated, useMounted } from "@/lib/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { SkeletonBudgetRow } from "@/components/ui/skeleton"
import { ConfirmAction } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, AlertTriangle, Pencil, PiggyBank } from "lucide-react"

interface Budget {
  id: string
  amount: number
  spent: number
  month: number
  year: number
  percentage: number
  remaining: number
  overBudget: boolean
  category: { id: string; name: string; color: string; icon: string }
}

interface Category {
  id: string
  name: string
  type: string
}

export default function BudgetsPage() {
  const queryClient = useQueryClient()
  const { activeFamilyId } = useFamilyStore()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState({
    amount: "",
    month: 1,
    year: 2024,
    categoryId: "",
  })

  useEffect(() => {
    const now = new Date()
    setForm(prev => ({ ...prev, month: now.getMonth() + 1, year: now.getFullYear() }))
  }, [])

  const [editForm, setEditForm] = useState({
    amount: "",
  })

  const { data: budgets, isLoading } = useQuery<Budget[]>({
    queryKey: ["budgets-summary", activeFamilyId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (activeFamilyId) params.set("familyId", activeFamilyId)
      return api(`/budgets/summary?${params}`)
    },
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories-budget", activeFamilyId],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set("type", "EXPENSE")
      params.set("includeDefault", "true")
      if (activeFamilyId) params.set("familyId", activeFamilyId)
      return api(`/categories?${params}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api("/budgets", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets-summary"] })
      setShowForm(false)
      setFormError("")
      setForm(prev => ({ ...prev, amount: "", categoryId: "" }))
      addToast({ title: "Presupuesto creado", variant: "success" })
    },
    onError: (err: Error) => {
      setFormError(err.message || "Error al guardar")
      addToast({ title: err.message || "Error al guardar", variant: "error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets-summary"] })
      setDeleteId(null)
      addToast({ title: "Presupuesto eliminado", variant: "success" })
    },
    onError: (err: Error) => {
      addToast({ title: err.message || "Error al eliminar", variant: "error" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api(`/budgets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets-summary"] })
      setEditingId(null)
      setFormError("")
      addToast({ title: "Presupuesto actualizado", variant: "success" })
    },
    onError: (err: Error) => {
      setFormError(err.message || "Error al actualizar")
      addToast({ title: err.message || "Error al actualizar", variant: "error" })
    },
  })

  function startEdit(b: Budget) {
    setEditingId(b.id)
    setEditForm({ amount: String(b.amount) })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ amount: "" })
    setFormError("")
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      setFormError("El monto debe ser mayor a 0")
      return
    }
    updateMutation.mutate({ id: editingId!, data: { amount: parseFloat(editForm.amount) } })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!form.categoryId) {
      setFormError("Selecciona una categoria")
      return
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setFormError("El monto debe ser mayor a 0")
      return
    }

    createMutation.mutate({
      ...form,
      amount: parseFloat(form.amount),
      familyId: activeFamilyId ? activeFamilyId : null,
    })
  }

  const totalBudgeted = (budgets || []).reduce((s, b) => s + b.amount, 0)
  const totalSpent = (budgets || []).reduce((s, b) => s + b.spent, 0)

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48"><SkeletonBudgetRow /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonBudgetRow />
          <SkeletonBudgetRow />
          <SkeletonBudgetRow />
        </div>
        <SkeletonBudgetRow />
        <SkeletonBudgetRow />
        <SkeletonBudgetRow />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Presupuestos</h1>
        <Button onClick={() => { setShowForm(!showForm); setFormError("") }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Presupuestado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(totalBudgeted, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gastado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatMoney(totalSpent, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Restante</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalBudgeted - totalSpent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatMoney(totalBudgeted - totalSpent, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm(prev => ({ ...prev, categoryId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Monto ({getCurrencySymbol(currency)})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={String(form.month)}
                  onValueChange={(v) => setForm(prev => ({ ...prev, month: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {formatMonthShort(i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  min="2020"
                  max="2030"
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                />
              </div>

              {formError && (
                <div className="md:col-span-2">
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">{formError}</p>
                </div>
              )}

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormError("") }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonBudgetRow />
          <SkeletonBudgetRow />
          <SkeletonBudgetRow />
        </div>
      ) : !budgets?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Sin presupuestos</p>
            <p className="text-sm mt-1">Crea tu primer presupuesto para controlar tus gastos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                {editingId === b.id ? (
                  <form onSubmit={handleEditSubmit} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: b.category?.color || "#6b7280" }}
                      >
                        {b.category?.icon?.charAt(0)?.toUpperCase() || "$"}
                      </div>
                      <p className="font-medium">{b.category?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Nuevo monto ({getCurrencySymbol(currency)})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        className="w-32"
                      />
                    </div>
                    {formError && (
                      <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">{formError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: b.category?.color || "#6b7280" }}
                        >
                          {b.category?.icon?.charAt(0)?.toUpperCase() || "$"}
                        </div>
                        <div>
                          <p className="font-medium">{b.category?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(b.spent, currency)} de {formatMoney(b.amount, currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {b.overBudget && (
                          <Badge variant="destructive" className="text-xs mr-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Excedido
                          </Badge>
                        )}
                        <button
                          onClick={() => startEdit(b)}
                          className="p-2 text-muted-foreground hover:text-blue-500 transition-colors rounded-lg"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(b.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          b.overBudget ? "bg-red-500" : b.percentage >= 80 ? "bg-yellow-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {b.percentage.toFixed(0)}%
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmAction
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar presupuesto"
        description="Esta accion no se puede deshacer. Se eliminara el presupuesto permanentemente."
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId)
        }}
      />
    </div>
  )
}
