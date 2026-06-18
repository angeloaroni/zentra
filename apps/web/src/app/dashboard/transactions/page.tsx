"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useSettings, getCurrencySymbol, formatMoney, formatDateShort, useHasHydrated, useMounted } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton, SkeletonTransactionRow } from "@/components/ui/skeleton"
import { ConfirmAction } from "@/components/ui/confirm-dialog"
import { Plus, Trash2, Repeat, Filter, X, Pencil, ArrowLeftRight, Search } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { TagInput } from "@/components/ui/tag-input"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import Link from "next/link"

interface Transaction {
  id: string
  type: string
  title: string
  description?: string
  amount: number
  currency: string
  date: string
  categoryId: string
  paymentMethod?: string
  isRecurring: boolean
  recurringFreq?: string
  category: { id: string; name: string; color: string; icon: string }
  tags?: { id: string; name: string; color: string; icon: string }[]
}

interface Category {
  id: string
  name: string
  type: string
  icon: string
  color: string
}

interface Tag {
  id: string
  name: string
  color: string
  icon: string
  budget: number | null
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
}

const FREQUENCIES = [
  { value: "DAILY", label: "Diario" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "YEARLY", label: "Anual" },
]

function formatDate(d: string) {
  return formatDateShort(d)
}

function getFreqLabel(freq?: string) {
  return FREQUENCIES.find((f) => f.value === freq)?.label || freq
}

function escapeCSV(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function renderTxIcon(iconName: string, className = "h-3 w-3") {
  const icons = {
    cake: "🎂", gift: "🎁", heart: "❤️", star: "⭐", home: "🏠",
    car: "🚗", plane: "✈️", "shopping-bag": "🛍️", utensils: "🍴",
    coffee: "☕", beer: "🍺", film: "🎬", music: "🎵", book: "📖",
    briefcase: "💼", "graduation-cap": "🎓", baby: "👶", "tree-pine": "🎄",
    "party-popper": "🎉", "heart-handshake": "💑",
  }
  return icons[iconName as keyof typeof icons] || "🏷️"
}

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

interface FormState {
  type: string
  title: string
  amount: string
  date: string
  categoryId: string
  accountId: string
  description: string
  paymentMethod: string
  isRecurring: boolean
  recurringFreq: string
  tagIds: string[]
}

const defaultForm = (): FormState => ({
  type: "EXPENSE",
  title: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  categoryId: "",
  accountId: "",
  description: "",
  paymentMethod: "",
  isRecurring: false,
  recurringFreq: "MONTHLY",
  tagIds: [],
})

export default function TransactionsPage() {
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const { activeFamilyId } = useFamilyStore()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"all" | "recurring">("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [skip, setSkip] = useState(0)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const [filters, setFilters] = useState({
    minAmount: "",
    maxAmount: "",
    categoryId: "",
    paymentMethod: "",
    tagId: "",
  })
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" })
  const [accountFilter, setAccountFilter] = useState("")

  useEffect(() => {
    setSkip(0)
  }, [filterType, viewMode, debouncedSearch, filters, activeFamilyId])

  useEffect(() => {
    setSkip(0)
    setDateRange({ startDate: "", endDate: "" })
    setAccountFilter("")
  }, [filterType, viewMode, debouncedSearch, activeFamilyId])

  const [form, setForm] = useState<FormState>(defaultForm())

  const { data: txData, isLoading: txLoading, error: txError } = useQuery<{
    transactions: Transaction[]
    total: number
  }>({
    queryKey: ["transactions", filterType, viewMode, debouncedSearch, filters, activeFamilyId, skip, dateRange, accountFilter],
    queryFn: () => {
      const params = new URLSearchParams({ take: "50", skip: String(skip) })
      if (filterType !== "all") params.set("type", filterType)
      if (viewMode === "recurring") params.set("recurring", "true")
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
      if (filters.minAmount) params.set("minAmount", filters.minAmount)
      if (filters.maxAmount) params.set("maxAmount", filters.maxAmount)
      if (filters.categoryId) params.set("categoryId", filters.categoryId)
      if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod)
      if (filters.tagId) params.set("tagId", filters.tagId)
      if (dateRange.startDate) params.set("startDate", dateRange.startDate)
      if (dateRange.endDate) params.set("endDate", dateRange.endDate)
      if (accountFilter) params.set("accountId", accountFilter)
      if (activeFamilyId) params.set("familyId", activeFamilyId)
      return api(`/transactions?${params}`)
    },
  })

  const { data: allTags } = useQuery<Tag[]>({
    queryKey: ["tags", activeFamilyId],
    queryFn: () => {
      const params = activeFamilyId ? `?familyId=${activeFamilyId}` : ""
      return api(`/tags${params}`)
    },
  })

  const { data: categories, isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["categories", activeFamilyId],
    queryFn: () => {
      const params = new URLSearchParams({ includeDefault: "true" })
      if (activeFamilyId) params.set("familyId", activeFamilyId)
      return api(`/categories?${params}`)
    },
  })

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["accounts", activeFamilyId],
    queryFn: () => {
      const params = activeFamilyId ? `?familyId=${activeFamilyId}` : ""
      return api(`/accounts${params}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api("/transactions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["summary"] })
      queryClient.invalidateQueries({ queryKey: ["by-category"] })
      queryClient.invalidateQueries({ queryKey: ["budgets-summary"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      setShowForm(false)
      setFormError("")
      setForm(defaultForm())
      addToast({ title: "Transaccion creada", variant: "success" })
    },
    onError: (err: Error) => {
      setFormError(err.message || "Error al guardar")
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["summary"] })
      queryClient.invalidateQueries({ queryKey: ["by-category"] })
      queryClient.invalidateQueries({ queryKey: ["budgets-summary"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      setEditingId(null)
      setFormError("")
      setForm(defaultForm())
      addToast({ title: "Transaccion actualizada", variant: "success" })
    },
    onError: (err: Error) => {
      setFormError(err.message || "Error al actualizar")
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["summary"] })
      queryClient.invalidateQueries({ queryKey: ["by-category"] })
      queryClient.invalidateQueries({ queryKey: ["budgets-summary"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      setDeleteId(null)
      addToast({ title: "Transaccion eliminada", variant: "success" })
    },
    onError: (err: Error) => {
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const filteredCategories = (categories || []).filter((c) =>
    form.type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE"
  )

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonTransactionRow key={i} />
          ))}
        </div>
      </div>
    )
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setShowForm(false)
    setFormError("")
    setForm({
      type: tx.type,
      title: tx.title,
      amount: String(tx.amount),
      date: tx.date ? new Date(tx.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      categoryId: tx.categoryId,
      accountId: (tx as any).accountId || "",
      description: tx.description || "",
      paymentMethod: tx.paymentMethod || "",
      isRecurring: tx.isRecurring,
      recurringFreq: tx.recurringFreq || "MONTHLY",
      tagIds: tx.tags?.map((t) => t.id) || [],
    })
  }

  function startCreate() {
    setEditingId(null)
    setShowForm(true)
    setFormError("")
    setForm(defaultForm())
  }

  function cancelForm() {
    setEditingId(null)
    setShowForm(false)
    setFormError("")
    setForm(defaultForm())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!form.title.trim()) {
      setFormError("El titulo es requerido")
      return
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setFormError("El monto debe ser mayor a 0")
      return
    }
    if (!form.categoryId) {
      setFormError("Selecciona una categoria")
      return
    }

    const payload = {
      type: form.type,
      title: form.title.trim(),
      amount: parseFloat(form.amount),
      currency,
      date: form.date,
      categoryId: form.categoryId,
      ...(form.accountId && { accountId: form.accountId }),
      description: form.description || undefined,
      paymentMethod: form.paymentMethod || undefined,
      isRecurring: form.isRecurring,
      recurringFreq: form.isRecurring ? form.recurringFreq : undefined,
      tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate({
        ...payload,
        familyId: activeFamilyId ? activeFamilyId : null,
      })
    }
  }

  const isFormVisible = showForm || editingId !== null
  const isPending = editingId ? updateMutation.isPending : createMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">Transacciones</h1>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Button>
      </div>

      <Modal open={isFormVisible} onClose={cancelForm} title={editingId ? "Editar transaccion" : "Nueva transaccion"}>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <select
                value={form.type}
                onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value, categoryId: "" }))}
                className={selectClass}
              >
                <option value="EXPENSE">Gasto</option>
                <option value="INCOME">Ingreso</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Titulo</Label>
            <Input
              placeholder="Ej: Supermercado"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Monto ({getCurrencySymbol(currency)})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                className={selectClass}
              >
                <option value="">{catLoading ? "Cargando..." : "Seleccionar..."}</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {accounts && accounts.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cuenta</Label>
                <select
                  className={selectClass}
                  value={form.accountId}
                  onChange={(e) => setForm(prev => ({ ...prev, accountId: e.target.value }))}
                >
                  <option value="">Sin cuenta</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Metodo de pago</Label>
                <Input
                  placeholder="Ej: Tarjeta"
                  value={form.paymentMethod}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {!(accounts && accounts.length > 0) && (
            <div className="space-y-1.5">
              <Label className="text-xs">Metodo de pago</Label>
              <Input
                placeholder="Ej: Tarjeta de credito"
                value={form.paymentMethod}
                onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="h-9"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Descripcion</Label>
              <Input
                placeholder="Opcional"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Recurrente</Label>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors w-full h-9 ${
                  form.isRecurring
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                <Repeat className="h-4 w-4" />
                {form.isRecurring ? "Si" : "No"}
              </button>
            </div>
          </div>

          {form.isRecurring && (
            <div className="space-y-1.5">
              <Label className="text-xs">Frecuencia</Label>
              <select
                value={form.recurringFreq}
                onChange={(e) => setForm(prev => ({ ...prev, recurringFreq: e.target.value }))}
                className={selectClass}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          <TagInput
            selectedTagIds={form.tagIds}
            onTagsChange={(tagIds) => setForm(prev => ({ ...prev, tagIds }))}
            allTags={allTags || []}
          />

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          <div className="flex gap-2 pt-1 sticky bottom-0 bg-white dark:bg-gray-900 pb-4">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={cancelForm}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <Input
            placeholder="Buscar transacciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 h-10"
          />
          <div className="flex items-end gap-2">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            {accounts && accounts.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground invisible">Cuenta</Label>
                <select
                  className="h-10 min-w-[180px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                >
                  <option value="">Todas las cuentas</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-1">
            <div className="flex gap-1">
              {(["all", "INCOME", "EXPENSE"] as const).map((t) => (
                <Button
                  key={t}
                  variant={filterType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(t)}
                  className="h-10"
                >
                  {t === "all" ? "Todas" : t === "INCOME" ? "Ingresos" : "Gastos"}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("all")}
                className="h-10"
              >
                Todas
              </Button>
              <Button
                variant={viewMode === "recurring" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("recurring")}
                className="h-10"
              >
                <Repeat className="h-3 w-3 mr-1" />
                Recurrentes
              </Button>
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10"
            >
              <Filter className="h-3 w-3 mr-1" />
              Filtros
              {(filters.minAmount || filters.maxAmount || filters.categoryId || filters.paymentMethod) && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {[filters.minAmount, filters.maxAmount, filters.categoryId, filters.paymentMethod].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const txs = txData?.transactions || []
                if (!txs.length) return
                const header = "Fecha,Tipo,Titulo,Categoria,Monto,Moneda,Descripcion\n"
                const rows = txs.map((tx) =>
                  [
                    tx.date,
                    tx.type,
                    escapeCSV(tx.title),
                    escapeCSV(tx.category?.name || ""),
                    tx.amount,
                    tx.currency || currency,
                    escapeCSV(tx.description || ""),
                  ].join(",")
                ).join("\n")
                const blob = new Blob([header + rows], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `transacciones-${new Date().toISOString().split("T")[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="h-10"
            >
              CSV
            </Button>
          </div>
        </div>
      </div>

      {showFilters && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Monto minimo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Monto maximo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Categoria</Label>
                <select
                  value={filters.categoryId || "all"}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value === "all" ? "" : e.target.value })}
                  className={selectClass}
                >
                  <option value="all">Todas</option>
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Metodo de pago</Label>
                <Input
                  placeholder="Ej: Efectivo"
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Evento</Label>
                <select
                  value={filters.tagId || "all"}
                  onChange={(e) => setFilters({ ...filters, tagId: e.target.value === "all" ? "" : e.target.value })}
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  {(allTags || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {(filters.minAmount || filters.maxAmount || filters.categoryId || filters.paymentMethod || filters.tagId) && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ minAmount: "", maxAmount: "", categoryId: "", paymentMethod: "", tagId: "" })}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {txError && (
        <Card><CardContent className="py-4 text-center text-red-500 text-sm">
          Error al cargar. Verifica que el servidor este corriendo.
        </CardContent></Card>
      )}

      <Card>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonTransactionRow key={i} />
              ))}
            </div>
          ) : !txData?.transactions?.length ? (
            <div className="py-12 text-center">
              <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {viewMode === "recurring" ? "Sin transacciones recurrentes" : "Sin transacciones"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crea tu primera transaccion para empezar a rastrear tus gastos
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {txData.transactions.map((tx) => (
<div key={tx.id} className="flex items-center justify-between p-4 hover:bg-accent/50 gap-2">
                   <div className="flex items-center gap-3 min-w-0 flex-1">
                     <div
                       className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                       style={{ backgroundColor: tx.category?.color || "#6b7280" }}
                     >
                       {tx.category?.icon?.charAt(0)?.toUpperCase() || "$"}
                     </div>
                     <div className="min-w-0">
                       <div className="flex items-center gap-2 min-w-0">
                         <p className="text-sm font-medium truncate">{tx.title}</p>
                         {tx.isRecurring && (
                           <Badge variant="secondary" className="text-xs shrink-0">
                             <Repeat className="h-3 w-3 mr-1" />
                             {getFreqLabel(tx.recurringFreq)}
                           </Badge>
                         )}
                       </div>
                       <p className="text-xs text-muted-foreground truncate">
                         {tx.category?.name}
                         {tx.tags && tx.tags.length > 0 && (
                           <span className="ml-2">
                             · {tx.tags.map((t) => (
                               <Link
                                 key={t.id}
                                 href={`/dashboard/events/${t.id}`}
                                 className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-white ml-1"
                                 style={{ backgroundColor: t.color }}
                               >
                                 {renderTxIcon(t.icon)} {t.name}
                               </Link>
                             ))}
                           </span>
                         )}
                         · {formatDate(tx.date)}
                         {activeFamilyId && (tx as any).user && ` · ${(tx as any).user.name}`}
                         {tx.paymentMethod && ` · ${tx.paymentMethod}`}
                       </p>
                     </div>
                   </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm font-semibold whitespace-nowrap ${tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatMoney(tx.amount, tx.currency || currency)}
                      </span>
                      <button
                        onClick={() => startEdit(tx)}
                        className="text-muted-foreground hover:text-blue-500 transition-colors shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(tx.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                 </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {txData && txData.total > skip + 50 && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={() => setSkip(prev => prev + 50)}>
            Cargar mas
          </Button>
        </div>
      )}

      <ConfirmAction
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Eliminar transaccion"
        description="Esta accion no se puede deshacer. Se eliminara la transaccion permanentemente."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}