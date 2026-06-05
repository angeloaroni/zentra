"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getUser, uploadFile } from "@/lib/api"
import { useSettings, formatMoney, formatDateShort, useHasHydrated, useMounted } from "@/lib/settings"
import { useToast } from "@/components/ui/toast"

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace("/api", "")
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmAction } from "@/components/ui/confirm-dialog"
import {
  ArrowLeft, Plus, Trash2, Users, Receipt, Scale, History, UserMinus, Send,
  Pencil, Eye, X, FileText, Image as ImageIcon, Clock, ChevronDown, ChevronUp,
  Search, RefreshCw,
} from "lucide-react"
import Link from "next/link"

interface User {
  id: string
  name: string
  avatar?: string
}

interface ExpenseSplit {
  id: string
  userId: string
  amount: number
  percentage?: number
  isPaid: boolean
  paidAt?: string
  user: User
}

interface SharedExpense {
  id: string
  title: string
  description?: string
  amount: number
  currency: string
  date: string
  splitType: string
  receiptUrl?: string
  paidBy: User
  splits: ExpenseSplit[]
}

interface Settlement {
  id: string
  fromUser: User
  toUser: User
  amount: number
  date: string
  notes?: string
}

interface SplitGroup {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  currency: string
  createdBy: User
  members: Array<{ user: User; role: string }>
  expenses: SharedExpense[]
  settlements: Settlement[]
}

interface Balance {
  userId: string
  amount: number
}

interface SimplifiedDebt {
  from: string
  to: string
  amount: number
  fromName: string
  toName: string
}

interface BalancesResponse {
  netBalances: Balance[]
  simplifiedDebts: SimplifiedDebt[]
}

interface RecurringExpense {
  id: string
  title: string
  amount: number
  currency: string
  frequency: string
  splitType: string
  nextDueDate: string
  active: boolean
  paidBy: User
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "history" | "members" | "recurring">("expenses")
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null)
  const [detailExpense, setDetailExpense] = useState<SharedExpense | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [deleteGroupId, setDeleteGroupId] = useState(false)
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null)
  const [showSettlementForm, setShowSettlementForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [formError, setFormError] = useState("")
  const [search, setSearch] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    splitType: "EQUAL" as "EQUAL" | "PERCENTAGE" | "EXACT",
    selectedMembers: [] as string[],
    percentages: {} as Record<string, string>,
    exactAmounts: {} as Record<string, string>,
  })

  const [settlementForm, setSettlementForm] = useState({ toUserId: "", amount: "", notes: "" })
  const [inviteEmail, setInviteEmail] = useState("")
  const [editGroupForm, setEditGroupForm] = useState({ name: "", description: "" })
  const [recurringForm, setRecurringForm] = useState({
    title: "", amount: "", frequency: "MONTHLY", nextDueDate: new Date().toISOString().split("T")[0],
  })

  useEffect(() => { setUser(getUser()) }, [])

  const { data: group, isLoading } = useQuery<SplitGroup>({
    queryKey: ["split-group", groupId],
    queryFn: () => api(`/splits/groups/${groupId}`),
    enabled: !!groupId,
  })

  const { data: balances } = useQuery<BalancesResponse>({
    queryKey: ["split-balances", groupId],
    queryFn: () => api(`/splits/balances?groupId=${groupId}`),
    enabled: !!groupId,
  })

  const { data: recurringExpenses } = useQuery<RecurringExpense[]>({
    queryKey: ["split-recurring", groupId],
    queryFn: () => api(`/splits/recurring?groupId=${groupId}`),
    enabled: !!groupId && activeTab === "recurring",
  })

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => api("/splits/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: async (result: any) => {
      if (receiptFile && result?.id) {
        try { await uploadFile(`/splits/expenses/${result.id}/receipt`, receiptFile) } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
      resetExpenseForm()
      addToast({ title: "Gasto creado", variant: "success" })
    },
    onError: (err: Error) => { setFormError(err.message); addToast({ title: "Error", description: err.message, variant: "error" }) },
  })

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api(`/splits/expenses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: async (result: any) => {
      const expenseId = editingExpense?.id
      if (receiptFile && expenseId) {
        try { await uploadFile(`/splits/expenses/${expenseId}/receipt`, receiptFile) } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
      if (expenseId) {
        try {
          const updated = await api<SharedExpense>(`/splits/expenses/${expenseId}`)
          setDetailExpense(updated)
        } catch {}
      }
      resetExpenseForm()
      addToast({ title: "Gasto actualizado", variant: "success" })
    },
    onError: (err: Error) => { setFormError(err.message); addToast({ title: "Error", description: err.message, variant: "error" }) },
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => api(`/splits/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
      setDeleteExpenseId(null)
      addToast({ title: "Gasto eliminado", variant: "success" })
    },
  })

  const markSplitPaidMutation = useMutation({
    mutationFn: ({ expenseId, splitId }: { expenseId: string; splitId: string }) =>
      api(`/splits/expenses/${expenseId}/splits/${splitId}/pay`, { method: "PATCH" }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
      if (detailExpense) {
        try {
          const updated = await api<SharedExpense>(`/splits/expenses/${detailExpense.id}`)
          setDetailExpense(updated)
        } catch {}
      }
      addToast({ title: "Marcado como pagado", variant: "success" })
    },
  })

  const createSettlementMutation = useMutation({
    mutationFn: (data: any) => api("/splits/settlements", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-overall-balance"] })
      setShowSettlementForm(false)
      setSettlementForm({ toUserId: "", amount: "", notes: "" })
      addToast({ title: "Pago registrado", variant: "success" })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const inviteMutation = useMutation({
    mutationFn: (data: any) => api(`/splits/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      setShowInviteForm(false)
      setInviteEmail("")
      addToast({ title: "Miembro invitado", variant: "success" })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api(`/splits/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      setDeleteMemberId(null)
      addToast({ title: "Miembro removido", variant: "success" })
    },
  })

  const updateGroupMutation = useMutation({
    mutationFn: (data: any) => api(`/splits/groups/${groupId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      setShowEditGroup(false)
      addToast({ title: "Grupo actualizado", variant: "success" })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteGroupMutation = useMutation({
    mutationFn: () => api(`/splits/groups/${groupId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-groups"] })
      setDeleteGroupId(false)
      router.push("/dashboard/splits")
      addToast({ title: "Grupo eliminado", variant: "success" })
    },
  })

  const createRecurringMutation = useMutation({
    mutationFn: (data: any) => api("/splits/recurring", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-recurring", groupId] })
      setShowRecurringForm(false)
      setRecurringForm({ title: "", amount: "", frequency: "MONTHLY", nextDueDate: new Date().toISOString().split("T")[0] })
      addToast({ title: "Gasto recurrente creado", variant: "success" })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteRecurringMutation = useMutation({
    mutationFn: (id: string) => api(`/splits/recurring/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-recurring", groupId] })
      addToast({ title: "Gasto recurrente eliminado", variant: "success" })
    },
  })

  function resetExpenseForm() {
    setShowExpenseForm(false)
    setEditingExpense(null)
    setFormError("")
    setReceiptFile(null)
    setReceiptPreview(null)
    setExpenseForm({ title: "", description: "", amount: "", date: new Date().toISOString().split("T")[0], splitType: "EQUAL", selectedMembers: [], percentages: {}, exactAmounts: {} })
  }

  function startEditExpense(expense: SharedExpense) {
    setEditingExpense(expense)
    setShowExpenseForm(true)
    setFormError("")
    setExpenseForm({
      title: expense.title,
      description: expense.description || "",
      amount: String(expense.amount),
      date: new Date(expense.date).toISOString().split("T")[0],
      splitType: expense.splitType as any,
      selectedMembers: expense.splits.map((s) => s.userId),
      percentages: Object.fromEntries(expense.splits.filter((s) => s.percentage).map((s) => [s.userId, String(s.percentage)])),
      exactAmounts: Object.fromEntries(expense.splits.map((s) => [s.userId, String(s.amount)])),
    })
    if (expense.receiptUrl) setReceiptPreview(`${API_BASE}${expense.receiptUrl}`)
  }

  function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!expenseForm.title.trim() || !expenseForm.amount) return

    const amount = parseFloat(expenseForm.amount)
    const members = expenseForm.selectedMembers.length > 0 ? expenseForm.selectedMembers : group?.members.map((m) => m.user.id) || []

    let splits
    if (expenseForm.splitType === "PERCENTAGE") {
      splits = members.map((userId) => ({ userId, percentage: parseFloat(expenseForm.percentages[userId] || "0"), amount: 0 }))
    } else if (expenseForm.splitType === "EXACT") {
      splits = members.map((userId) => ({ userId, amount: parseFloat(expenseForm.exactAmounts[userId] || "0") }))
    } else {
      splits = members.map((userId) => ({ userId, amount: 0 }))
    }

    const payload = {
      groupId, title: expenseForm.title.trim(), description: expenseForm.description.trim() || undefined,
      amount, splitType: expenseForm.splitType, date: new Date(expenseForm.date).toISOString(), splits,
    }

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data: payload })
    } else {
      createExpenseMutation.mutate(payload)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { addToast({ title: "Archivo muy grande", description: "Maximo 5MB", variant: "error" }); return }
    setReceiptFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function toggleMemberSelection(userId: string) {
    setExpenseForm((prev) => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(userId) ? prev.selectedMembers.filter((id) => id !== userId) : [...prev.selectedMembers, userId],
    }))
  }

  const filteredExpenses = group?.expenses.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase())
  ) || []

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-8 w-48" /></div>
        <div className="flex gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-24" />)}</div>
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div>
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground py-8">Grupo no encontrado</p>
        <Link href="/dashboard/splits"><Button variant="outline">Volver</Button></Link>
      </div>
    )
  }

  const tabs = [
    { id: "expenses" as const, label: "Gastos", icon: Receipt },
    { id: "balances" as const, label: "Balances", icon: Scale },
    { id: "history" as const, label: "Historial", icon: History },
    { id: "members" as const, label: "Miembros", icon: Users },
    { id: "recurring" as const, label: "Recurrentes", icon: RefreshCw },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/splits" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: group.color }}>
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold truncate">{group.name}</h1>
          {group.description && <p className="text-sm text-muted-foreground truncate">{group.description}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => { setEditGroupForm({ name: group.name, description: group.description || "" }); setShowEditGroup(!showEditGroup) }} className="shrink-0">
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
        {user?.id === group.createdBy.id && (
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 shrink-0 p-2 min-h-[44px] min-w-[44px]" onClick={() => setDeleteGroupId(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showEditGroup && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Editar grupo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); updateGroupMutation.mutate(editGroupForm) }} className="space-y-4">
              <div className="space-y-2"><Label>Nombre</Label><Input value={editGroupForm.name} onChange={(e) => setEditGroupForm(prev => ({ ...prev, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Descripcion</Label><Input value={editGroupForm.description} onChange={(e) => setEditGroupForm(prev => ({ ...prev, description: e.target.value }))} /></div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={updateGroupMutation.isPending}>Guardar</Button>
                <Button type="button" variant="outline" onClick={() => setShowEditGroup(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar gastos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => { resetExpenseForm(); setShowExpenseForm(true) }}>
              <Plus className="h-4 w-4 mr-2" />Nuevo gasto
            </Button>
          </div>

          {showExpenseForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{editingExpense ? "Editar gasto" : "Nuevo gasto"}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Titulo *</Label><Input placeholder="Ej: Cena, Taxi, Hotel" value={expenseForm.title} onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label>Monto ({group.currency}) *</Label><Input type="number" step="0.01" min="0.01" placeholder="0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} required /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Tipo de division</Label>
                      <div className="flex gap-2">
                        {(["EQUAL", "PERCENTAGE", "EXACT"] as const).map((type) => (
                          <Button key={type} type="button" variant={expenseForm.splitType === type ? "default" : "outline"} size="sm"
                            onClick={() => setExpenseForm(prev => ({ ...prev, splitType: type }))}>
                            {type === "EQUAL" ? "Igual" : type === "PERCENTAGE" ? "%" : "Exacto"}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Descripcion (opcional)</Label><Input placeholder="Descripcion..." value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>Ticket/factura (opcional)</Label>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                    {receiptPreview ? (
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        {receiptFile?.type.startsWith("image/") || receiptPreview.startsWith("data:image") ? (
                          <img src={receiptPreview} alt="Preview" className="h-16 w-16 object-cover rounded" />
                        ) : (
                          <FileText className="h-8 w-8 text-blue-500" />
                        )}
                        <div className="flex-1"><p className="text-sm font-medium truncate">{receiptFile?.name || "Ticket subido"}</p></div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4 mr-2" />Subir imagen o PDF
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2"><Label>Participantes</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.members.map((m) => {
                        const isSelected = expenseForm.selectedMembers.includes(m.user.id) || expenseForm.selectedMembers.length === 0
                        return (
                          <div key={m.user.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-gray-200 dark:border-gray-700"}`}
                            onClick={() => toggleMemberSelection(m.user.id)}>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                              {m.user.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.user.name}</p></div>
                            {expenseForm.splitType === "PERCENTAGE" && isSelected && (
                              <Input type="number" step="0.01" min="0" max="100" placeholder="%" className="w-20 h-8 shrink-0" value={expenseForm.percentages[m.user.id] || ""} onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setExpenseForm(prev => ({ ...prev, percentages: { ...prev.percentages, [m.user.id]: e.target.value } }))} />
                            )}
                            {expenseForm.splitType === "EXACT" && isSelected && (
                              <Input type="number" step="0.01" min="0" placeholder={group.currency} className="w-24 h-8 shrink-0" value={expenseForm.exactAmounts[m.user.id] || ""} onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setExpenseForm(prev => ({ ...prev, exactAmounts: { ...prev.exactAmounts, [m.user.id]: e.target.value } }))} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}>
                      {editingExpense ? (updateExpenseMutation.isPending ? "Guardando..." : "Guardar") : (createExpenseMutation.isPending ? "Creando..." : "Crear gasto")}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetExpenseForm}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {filteredExpenses.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{search ? "Sin resultados" : "Sin gastos aun"}</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense) => (
                <Card key={expense.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailExpense(expense)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                          {expense.paidBy.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{expense.title}</p>
                            {expense.receiptUrl && <Receipt className="h-3 w-3 text-blue-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {expense.paidBy.name} pago &middot; {formatDateShort(new Date(expense.date))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold ${expense.splitType !== "EQUAL" ? "text-blue-600" : ""}`}>
                          {formatMoney(expense.amount, expense.currency)}
                        </span>
                        {expense.splitType !== "EQUAL" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{expense.splitType}</span>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {expense.splits.map((split) => (
                        <div key={split.id} className={`text-xs px-2 py-1 rounded-full ${split.isPaid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                          {split.user.name}: {formatMoney(split.amount, expense.currency)}{split.isPaid ? " ✓" : ""}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "balances" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowSettlementForm(!showSettlementForm); setFormError(""); setSettlementForm({ toUserId: "", amount: "", notes: "" }) }}>
              <Send className="h-4 w-4 mr-2" />Registrar pago
            </Button>
          </div>
          {showSettlementForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Registrar pago</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); setFormError(""); if (!settlementForm.toUserId || !settlementForm.amount) return; createSettlementMutation.mutate({ groupId, toUserId: settlementForm.toUserId, amount: parseFloat(settlementForm.amount), notes: settlementForm.notes || undefined }) }} className="space-y-4">
                  <div className="space-y-2"><Label>Pagar a</Label>
                    <select className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-sm" value={settlementForm.toUserId} onChange={(e) => setSettlementForm(prev => ({ ...prev, toUserId: e.target.value }))} required>
                      <option value="">Seleccionar...</option>
                      {group.members.filter((m) => m.user.id !== user?.id).map((m) => (<option key={m.user.id} value={m.user.id}>{m.user.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Monto ({group.currency}) *</Label><Input type="number" step="0.01" min="0.01" placeholder="0.00" value={settlementForm.amount} onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>Notas</Label><Input placeholder="Nota..." value={settlementForm.notes} onChange={(e) => setSettlementForm(prev => ({ ...prev, notes: e.target.value }))} /></div>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createSettlementMutation.isPending}>{createSettlementMutation.isPending ? "Registrando..." : "Registrar pago"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowSettlementForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          {balances?.simplifiedDebts.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Todos estan al dia</p><p className="text-sm text-muted-foreground mt-1">No hay deudas pendientes</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {balances?.simplifiedDebts.map((debt, i) => (
                <Card key={i}><CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm">{debt.fromName?.charAt(0)?.toUpperCase()}</div>
                    <div><p className="font-medium">{debt.fromName}</p><p className="text-xs text-muted-foreground">debe</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-red-600">{formatMoney(debt.amount, group.currency)}</span>
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">{debt.toName?.charAt(0)?.toUpperCase()}</div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {group.settlements.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><History className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Sin pagos registrados</p></CardContent></Card>
          ) : (
            group.settlements.map((s) => (
              <Card key={s.id}><CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">{s.fromUser.name?.charAt(0)?.toUpperCase()}</div>
                  <div><p className="font-medium">{s.fromUser.name} pago a {s.toUser.name}</p><p className="text-xs text-muted-foreground">{formatDateShort(new Date(s.date))}</p>{s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}</div>
                </div>
                <span className="font-bold text-emerald-600">{formatMoney(s.amount, group.currency)}</span>
              </CardContent></Card>
            ))
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowInviteForm(!showInviteForm); setFormError("") }}><Plus className="h-4 w-4 mr-2" />Invitar</Button>
          </div>
          {showInviteForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Invitar miembro</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); if (!inviteEmail.trim()) return; inviteMutation.mutate({ email: inviteEmail.trim() }) }} className="space-y-4">
                  <div className="space-y-2"><Label>Email del usuario</Label><Input type="email" placeholder="email@ejemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required /></div>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={inviteMutation.isPending}>{inviteMutation.isPending ? "Invitando..." : "Invitar"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {group.members.map((m) => (
              <Card key={m.user.id}><CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">{m.user.name?.charAt(0)?.toUpperCase()}</div>
                  <div><p className="font-medium">{m.user.name}</p><p className="text-xs text-muted-foreground capitalize">{m.role === "ADMIN" ? "Creador" : "Miembro"}</p></div>
                </div>
                {m.user.id !== user?.id && user?.id === group.createdBy.id && (
                  <button onClick={() => setDeleteMemberId(m.user.id)} className="text-muted-foreground hover:text-red-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"><UserMinus className="h-4 w-4" /></button>
                )}
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "recurring" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowRecurringForm(!showRecurringForm); setFormError("") }}><Plus className="h-4 w-4 mr-2" />Nuevo recurrente</Button>
          </div>
          {showRecurringForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Gasto recurrente</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); setFormError(""); if (!recurringForm.title.trim() || !recurringForm.amount) return; createRecurringMutation.mutate({ groupId, title: recurringForm.title.trim(), amount: parseFloat(recurringForm.amount), frequency: recurringForm.frequency, splitType: "EQUAL", nextDueDate: new Date(recurringForm.nextDueDate).toISOString(), splits: group.members.map((m) => ({ userId: m.user.id, amount: 0 })) }) }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Titulo *</Label><Input placeholder="Ej: Alquiler, Internet" value={recurringForm.title} onChange={(e) => setRecurringForm(prev => ({ ...prev, title: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label>Monto *</Label><Input type="number" step="0.01" min="0.01" placeholder="0.00" value={recurringForm.amount} onChange={(e) => setRecurringForm(prev => ({ ...prev, amount: e.target.value }))} required /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Frecuencia</Label>
                      <select className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-sm" value={recurringForm.frequency} onChange={(e) => setRecurringForm(prev => ({ ...prev, frequency: e.target.value }))}>
                        <option value="DAILY">Diario</option><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensual</option><option value="YEARLY">Anual</option>
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Proxima fecha</Label><Input type="date" value={recurringForm.nextDueDate} onChange={(e) => setRecurringForm(prev => ({ ...prev, nextDueDate: e.target.value }))} /></div>
                  </div>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createRecurringMutation.isPending}>{createRecurringMutation.isPending ? "Creando..." : "Crear"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowRecurringForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          {!recurringExpenses?.length ? (
            <Card><CardContent className="py-12 text-center"><RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Sin gastos recurrentes</p><p className="text-sm text-muted-foreground mt-1">Crea gastos que se repitan automaticamente</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {recurringExpenses.map((r) => (
                <Card key={r.id}><CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm ${r.active ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}><RefreshCw className="h-4 w-4" /></div>
                    <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.paidBy.name} &middot; {r.frequency === "MONTHLY" ? "Mensual" : r.frequency === "WEEKLY" ? "Semanal" : r.frequency === "YEARLY" ? "Anual" : "Diario"} &middot; Proxima: {formatDateShort(new Date(r.nextDueDate))}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatMoney(r.amount, r.currency)}</span>
                    <button onClick={() => { if (confirm("Eliminar gasto recurrente?")) deleteRecurringMutation.mutate(r.id) }} className="text-muted-foreground hover:text-red-500 p-2"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {detailExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDetailExpense(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">{detailExpense.title}</h3>
              <button onClick={() => setDetailExpense(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {detailExpense.description && <p className="text-sm text-muted-foreground">{detailExpense.description}</p>}
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Monto total</span><span className="text-xl font-bold">{formatMoney(detailExpense.amount, detailExpense.currency)}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Pagado por</span><span className="font-medium">{detailExpense.paidBy.name}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Fecha</span><span className="font-medium">{formatDateShort(new Date(detailExpense.date))}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Tipo</span><span className="font-medium">{detailExpense.splitType === "EQUAL" ? "Igual para todos" : detailExpense.splitType === "PERCENTAGE" ? "Por porcentaje" : "Monto exacto"}</span></div>
              {detailExpense.receiptUrl && (
                <div><p className="text-sm text-muted-foreground mb-2">Ticket/factura</p>
                  {detailExpense.receiptUrl.endsWith(".pdf") ? (
                    <a href={`${API_BASE}${detailExpense.receiptUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline"><FileText className="h-5 w-5" />Ver PDF</a>
                  ) : (
                    <img src={`${API_BASE}${detailExpense.receiptUrl}`} alt="Ticket" className="max-h-48 rounded-lg border" />
                  )}
                </div>
              )}
              <div><p className="text-sm font-medium mb-2">Divisiones</p>
                <div className="space-y-2">
                  {detailExpense.splits.map((split) => (
                    <div key={split.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">{split.user.name?.charAt(0)?.toUpperCase()}</div>
                        <span className="text-sm">{split.user.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatMoney(split.amount, detailExpense.currency)}</span>
                        {!split.isPaid && (user?.id === detailExpense.paidBy.id || user?.id === split.userId) && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markSplitPaidMutation.mutate({ expenseId: detailExpense.id, splitId: split.id })} disabled={markSplitPaidMutation.isPending}>
                            Marcar pagado
                          </Button>
                        )}
                        {split.isPaid && <span className="text-xs text-emerald-600">Pagado ✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {(user?.id === detailExpense.paidBy.id || user?.id === group.createdBy.id) && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => { setDetailExpense(null); startEditExpense(detailExpense) }}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                  <Button variant="outline" size="sm" className="text-red-500" onClick={() => { setDetailExpense(null); setDeleteExpenseId(detailExpense.id) }}><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmAction open={deleteExpenseId !== null} onOpenChange={(open) => !open && setDeleteExpenseId(null)} title="Eliminar gasto" description="Esta accion no se puede deshacer." confirmLabel="Eliminar" onConfirm={() => deleteExpenseId && deleteExpenseMutation.mutate(deleteExpenseId)} loading={deleteExpenseMutation.isPending} />
      <ConfirmAction open={deleteGroupId} onOpenChange={setDeleteGroupId} title="Eliminar grupo" description="Todos los gastos y balances se perderan permanentemente." confirmLabel="Eliminar grupo" onConfirm={() => deleteGroupMutation.mutate()} loading={deleteGroupMutation.isPending} />
      <ConfirmAction open={deleteMemberId !== null} onOpenChange={(open) => !open && setDeleteMemberId(null)} title="Remover miembro" description="El miembro sera removido del grupo." confirmLabel="Remover" onConfirm={() => deleteMemberId && removeMemberMutation.mutate(deleteMemberId)} loading={removeMemberMutation.isPending} />
    </div>
  )
}
