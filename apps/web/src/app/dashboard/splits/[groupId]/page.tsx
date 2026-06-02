"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getUser } from "@/lib/api"
import { useSettings, formatMoney, formatDateShort, useHasHydrated, useMounted } from "@/lib/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft, Plus, Trash2, Users, Receipt, Scale, History, UserMinus, Send,
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

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()

  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "history" | "members">("expenses")
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showSettlementForm, setShowSettlementForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [formError, setFormError] = useState("")

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    splitType: "EQUAL" as "EQUAL" | "PERCENTAGE" | "EXACT",
    selectedMembers: [] as string[],
    percentages: {} as Record<string, string>,
    exactAmounts: {} as Record<string, string>,
  })

  const [settlementForm, setSettlementForm] = useState({
    toUserId: "",
    amount: "",
    notes: "",
  })

  const [inviteEmail, setInviteEmail] = useState("")
  const [editGroupForm, setEditGroupForm] = useState({ name: "", description: "" })

  useEffect(() => {
    setUser(getUser())
  }, [])

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

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) =>
      api("/splits/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-overall-balance"] })
      setShowExpenseForm(false)
      setFormError("")
      setExpenseForm({
        title: "", amount: "", splitType: "EQUAL",
        selectedMembers: [], percentages: {}, exactAmounts: {},
      })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => api(`/splits/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
    },
  })

  const createSettlementMutation = useMutation({
    mutationFn: (data: any) =>
      api("/splits/settlements", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-overall-balance"] })
      setShowSettlementForm(false)
      setSettlementForm({ toUserId: "", amount: "", notes: "" })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const inviteMutation = useMutation({
    mutationFn: (data: any) =>
      api(`/splits/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      setShowInviteForm(false)
      setInviteEmail("")
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api(`/splits/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
    },
  })

  const updateGroupMutation = useMutation({
    mutationFn: (data: any) =>
      api(`/splits/groups/${groupId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      setShowEditGroup(false)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteGroupMutation = useMutation({
    mutationFn: () => api(`/splits/groups/${groupId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-groups"] })
      router.push("/dashboard/splits")
    },
  })

  function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!expenseForm.title.trim() || !expenseForm.amount) return

    const amount = parseFloat(expenseForm.amount)
    const members = expenseForm.selectedMembers.length > 0
      ? expenseForm.selectedMembers
      : group?.members.map((m) => m.user.id) || []

    let splits
    if (expenseForm.splitType === "PERCENTAGE") {
      splits = members.map((userId) => ({
        userId,
        percentage: parseFloat(expenseForm.percentages[userId] || "0"),
        amount: 0,
      }))
    } else if (expenseForm.splitType === "EXACT") {
      splits = members.map((userId) => ({
        userId,
        amount: parseFloat(expenseForm.exactAmounts[userId] || "0"),
      }))
    } else {
      splits = members.map((userId) => ({ userId, amount: 0 }))
    }

    createExpenseMutation.mutate({
      groupId,
      title: expenseForm.title.trim(),
      amount,
      splitType: expenseForm.splitType,
      date: new Date().toISOString(),
      splits,
    })
  }

  function handleCreateSettlement(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!settlementForm.toUserId || !settlementForm.amount) return

    createSettlementMutation.mutate({
      groupId,
      toUserId: settlementForm.toUserId,
      amount: parseFloat(settlementForm.amount),
      notes: settlementForm.notes || undefined,
    })
  }

  function toggleMemberSelection(userId: string) {
    setExpenseForm((prev) => {
      const selected = prev.selectedMembers.includes(userId)
        ? prev.selectedMembers.filter((id) => id !== userId)
        : [...prev.selectedMembers, userId]
      return { ...prev, selectedMembers: selected }
    })
  }

  if (!mounted || !hydrated) {
    return <div className="space-y-6"><p className="text-center text-muted-foreground py-8">Cargando...</p></div>
  }

  if (isLoading) {
    return <div className="space-y-6"><p className="text-center text-muted-foreground py-8">Cargando grupo...</p></div>
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground py-8">Grupo no encontrado</p>
        <Link href="/dashboard/splits">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: "expenses" as const, label: "Gastos", icon: Receipt },
    { id: "balances" as const, label: "Balances", icon: Scale },
    { id: "history" as const, label: "Historial", icon: History },
    { id: "members" as const, label: "Miembros", icon: Users },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/splits" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: group.color }}
        >
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setEditGroupForm({ name: group.name, description: group.description || "" })
          setShowEditGroup(!showEditGroup)
        }}>
          Editar
        </Button>
        {user?.id === group.createdBy.id && (
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600"
            onClick={() => {
              if (confirm("Eliminar este grupo? Todos los gastos y balances se perderan.")) {
                deleteGroupMutation.mutate()
              }
            }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showEditGroup && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Editar grupo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault()
              updateGroupMutation.mutate(editGroupForm)
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editGroupForm.name} onChange={(e) => setEditGroupForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Input value={editGroupForm.description} onChange={(e) => setEditGroupForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
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
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowExpenseForm(!showExpenseForm); setFormError("") }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo gasto
            </Button>
          </div>

          {showExpenseForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Nuevo gasto</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreateExpense} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Titulo</Label>
                      <Input placeholder="Ej: Cena, Taxi, Hotel" value={expenseForm.title}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Monto ({group.currency})</Label>
                      <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={expenseForm.amount}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de division</Label>
                    <div className="flex gap-2">
                      {(["EQUAL", "PERCENTAGE", "EXACT"] as const).map((type) => (
                        <Button key={type} type="button" variant={expenseForm.splitType === type ? "default" : "outline"}
                          onClick={() => setExpenseForm(prev => ({ ...prev, splitType: type }))}>
                          {type === "EQUAL" ? "Igual" : type === "PERCENTAGE" ? "Porcentaje" : "Monto exacto"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Participantes</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.members.map((m) => {
                        const isSelected = expenseForm.selectedMembers.includes(m.user.id) ||
                          expenseForm.selectedMembers.length === 0
                        return (
                          <div key={m.user.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                            onClick={() => toggleMemberSelection(m.user.id)}>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                              {m.user.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{m.user.name}</p>
                            </div>
                            {expenseForm.splitType === "PERCENTAGE" && isSelected && (
                              <Input type="number" step="0.01" min="0" max="100" placeholder="%"
                                className="w-20 h-8" value={expenseForm.percentages[m.user.id] || ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setExpenseForm(prev => ({
                                  ...prev,
                                  percentages: { ...prev.percentages, [m.user.id]: e.target.value },
                                }))} />
                            )}
                            {expenseForm.splitType === "EXACT" && isSelected && (
                              <Input type="number" step="0.01" min="0" placeholder={group.currency}
                                className="w-24 h-8" value={expenseForm.exactAmounts[m.user.id] || ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setExpenseForm(prev => ({
                                  ...prev,
                                  exactAmounts: { ...prev.exactAmounts, [m.user.id]: e.target.value },
                                }))} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {formError && <p className="text-sm text-red-500">{formError}</p>}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={createExpenseMutation.isPending}>
                      {createExpenseMutation.isPending ? "Creando..." : "Crear gasto"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowExpenseForm(false); setFormError("") }}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {group.expenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Sin gastos aun</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {group.expenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                          {expense.paidBy.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-semibold">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.paidBy.name} pago {formatMoney(expense.amount, expense.currency)} &middot; {formatDateShort(new Date(expense.date))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{formatMoney(expense.amount, expense.currency)}</p>
                        {(user?.id === expense.paidBy.id || user?.id === group.createdBy.id) && (
                          <button onClick={() => {
                            if (confirm("Eliminar este gasto?")) deleteExpenseMutation.mutate(expense.id)
                          }} className="text-muted-foreground hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {expense.splits.map((split) => (
                        <div key={split.id}
                          className={`text-xs px-2 py-1 rounded-full ${
                            split.isPaid
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                          {split.user.name}: {formatMoney(split.amount, expense.currency)}
                          {split.isPaid ? " ✓" : ""}
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
            <Button onClick={() => {
              setShowSettlementForm(!showSettlementForm)
              setFormError("")
              setSettlementForm({ toUserId: "", amount: "", notes: "" })
            }}>
              <Send className="h-4 w-4 mr-2" />
              Registrar pago
            </Button>
          </div>

          {showSettlementForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Registrar pago</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSettlement} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pagar a</Label>
                    <select className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-sm"
                      value={settlementForm.toUserId}
                      onChange={(e) => setSettlementForm(prev => ({ ...prev, toUserId: e.target.value }))} required>
                      <option value="">Seleccionar...</option>
                      {group.members
                        .filter((m) => m.user.id !== user?.id)
                        .map((m) => (
                          <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monto ({group.currency})</Label>
                    <Input type="number" step="0.01" min="0.01" placeholder="0.00"
                      value={settlementForm.amount}
                      onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <Input placeholder="Nota..." value={settlementForm.notes}
                      onChange={(e) => setSettlementForm(prev => ({ ...prev, notes: e.target.value }))} />
                  </div>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createSettlementMutation.isPending}>
                      {createSettlementMutation.isPending ? "Registrando..." : "Registrar pago"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowSettlementForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {balances?.simplifiedDebts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Todos estan al dia</p>
                <p className="text-sm text-muted-foreground mt-1">No hay deudas pendientes en este grupo</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {balances?.simplifiedDebts.map((debt, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm">
                        {debt.fromName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium">{debt.fromName}</p>
                        <p className="text-xs text-muted-foreground">debe</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-red-600">{formatMoney(debt.amount, group.currency)}</span>
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        {debt.toName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {group.settlements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Sin pagos registrados</p>
              </CardContent>
            </Card>
          ) : (
            group.settlements.map((settlement) => (
              <Card key={settlement.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                      {settlement.fromUser.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{settlement.fromUser.name} pago a {settlement.toUser.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDateShort(new Date(settlement.date))}</p>
                      {settlement.notes && <p className="text-xs text-muted-foreground">{settlement.notes}</p>}
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600">{formatMoney(settlement.amount, group.currency)}</span>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowInviteForm(!showInviteForm); setFormError("") }}>
              <Plus className="h-4 w-4 mr-2" />
              Invitar
            </Button>
          </div>

          {showInviteForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Invitar miembro</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (!inviteEmail.trim()) return
                  inviteMutation.mutate({ email: inviteEmail.trim() })
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email del usuario</Label>
                    <Input type="email" placeholder="email@ejemplo.com" value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)} required />
                  </div>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? "Invitando..." : "Invitar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {group.members.map((m) => (
              <Card key={m.user.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                      {m.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role === "ADMIN" ? "Creador" : "Miembro"}</p>
                    </div>
                  </div>
                  {m.user.id !== user?.id && user?.id === group.createdBy.id && (
                    <button onClick={() => {
                      if (confirm(`Remover a ${m.user.name} del grupo?`)) {
                        removeMemberMutation.mutate(m.user.id)
                      }
                    }} className="text-muted-foreground hover:text-red-500 p-2">
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
