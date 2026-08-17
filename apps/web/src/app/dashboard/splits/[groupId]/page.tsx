"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getUser, uploadFile } from "@/lib/api"
import { useSettings, formatMoney, formatDateShort, useHasHydrated, useMounted } from "@/lib/settings"
import { useToast } from "@/components/ui/toast"

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace("/api", "")
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmAction } from "@/components/ui/confirm-dialog"
import {
  ArrowLeft, Plus, Trash2, Users, Receipt, Scale, History, UserMinus, Send,
  Pencil, Eye, X, FileText, Image as ImageIcon, Clock, ChevronDown, ChevronUp,
  Search, RefreshCw, MoreVertical,
} from "lucide-react"
import { Modal } from "@/components/ui/modal"
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
  receiptData?: string
  receiptMime?: string
  paidBy: User
  splits: ExpenseSplit[]
  items?: ExpenseItem[]
}

interface ExpenseItem {
  id: string
  name: string
  amount: number
  quantity: number
  assignedTo: string[]
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

interface PendingInvitation {
  id: string
  email: string
  token: string
  status: string
  createdAt: string
  expiresAt: string
  inviter: User
}

interface DirectConsumption {
  user: User
  iOwe: number
  theyOweMe: number
  netDebt: number
  settled: number
  pending: number
  iOweBreakdown: Array<{ title: string; amount: number }>
  theyOweBreakdown: Array<{ title: string; amount: number }>
}

function getDirectConsumption(
  userId: string,
  expenses: SharedExpense[],
  members: Array<{ user: User; role: string }>,
  settlements: Settlement[]
): DirectConsumption[] {
  const iOweMap = new Map<string, { total: number; breakdown: Array<{ title: string; amount: number }> }>()
  const theyOweMap = new Map<string, { total: number; breakdown: Array<{ title: string; amount: number }> }>()

  for (const expense of expenses) {
    const userSplit = expense.splits.find((s) => s.userId === userId)

    if (expense.paidBy.id !== userId && userSplit) {
      const existing = iOweMap.get(expense.paidBy.id) || { total: 0, breakdown: [] }
      existing.total += userSplit.amount
      existing.breakdown.push({ title: expense.title, amount: userSplit.amount })
      iOweMap.set(expense.paidBy.id, existing)
    }

    if (expense.paidBy.id === userId) {
      for (const split of expense.splits) {
        if (split.userId === userId) continue
        const existing = theyOweMap.get(split.userId) || { total: 0, breakdown: [] }
        existing.total += split.amount
        existing.breakdown.push({ title: expense.title, amount: split.amount })
        theyOweMap.set(split.userId, existing)
      }
    }
  }

  const settledMap = new Map<string, number>()
  for (const s of settlements) {
    if (s.fromUser.id === userId) {
      settledMap.set(s.toUser.id, (settledMap.get(s.toUser.id) || 0) + s.amount)
    }
  }

  const allUserIds = Array.from(new Set([...Array.from(iOweMap.keys()), ...Array.from(theyOweMap.keys())]))

  return Array.from(allUserIds)
    .map((otherUserId) => {
      const iOweData = iOweMap.get(otherUserId) || { total: 0, breakdown: [] }
      const theyOweData = theyOweMap.get(otherUserId) || { total: 0, breakdown: [] }
      const settled = settledMap.get(otherUserId) || 0

      const iOwe = Math.round(iOweData.total * 100) / 100
      const theyOweMe = Math.round(theyOweData.total * 100) / 100
      const netDebt = Math.round((iOwe - theyOweMe) * 100) / 100
      const settledRounded = Math.round(settled * 100) / 100
      const pending = Math.round((netDebt - settledRounded) * 100) / 100

      return {
        user: members.find((m) => m.user.id === otherUserId)?.user || { id: otherUserId, name: "Unknown" },
        iOwe,
        theyOweMe,
        netDebt,
        settled: settledRounded,
        pending,
        iOweBreakdown: iOweData.breakdown,
        theyOweBreakdown: theyOweData.breakdown,
      }
    })
    .filter((c) => c.iOwe > 0.01 || c.theyOweMe > 0.01)
    .sort((a, b) => b.pending - a.pending)
}

const MEMBER_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
]

function getMemberColor(userId: string, members: Array<{ user: User; role: string }>): { bg: string; text: string } {
  const index = members.findIndex((m) => m.user.id === userId)
  return MEMBER_COLORS[index % MEMBER_COLORS.length] || MEMBER_COLORS[0]
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
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [formError, setFormError] = useState("")
  const [search, setSearch] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [showConverted, setShowConverted] = useState(false)
  const [menuExpenseId, setMenuExpenseId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showOptimalTransfers, setShowOptimalTransfers] = useState(false)
  const [showLiquidateConfirm, setShowLiquidateConfirm] = useState(false)

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    splitType: "EQUAL" as "EQUAL" | "PERCENTAGE" | "EXACT",
    selectedMembers: [] as string[],
    percentages: {} as Record<string, string>,
    exactAmounts: {} as Record<string, string>,
    paidBy: "" as string,
  })

  const [settlementForm, setSettlementForm] = useState({ toUserId: "", amount: "", notes: "" })
  const [inviteEmail, setInviteEmail] = useState("")
  const [editGroupForm, setEditGroupForm] = useState({ name: "", description: "" })
  const [recurringForm, setRecurringForm] = useState({
    title: "", amount: "", frequency: "MONTHLY", nextDueDate: new Date().toISOString().split("T")[0],
  })

  useEffect(() => { setUser(getUser()) }, [])

  useEffect(() => {
    function handleClickOutside() { setMenuExpenseId(null) }
    if (menuExpenseId) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [menuExpenseId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest(".templates-dropdown")) setShowTemplates(false)
    }
    if (showTemplates) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showTemplates])

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

  const { data: templates } = useQuery<{ id: string; name: string; splitType: string; memberIds: string[] }[]>({
    queryKey: ["split-templates"],
    queryFn: () => api("/splits/templates"),
  })

  const { data: pendingInvitations } = useQuery<PendingInvitation[]>({
    queryKey: ["split-invitations", groupId],
    queryFn: () => api(`/splits/groups/${groupId}/invitations`),
    enabled: !!groupId && activeTab === "members",
  })

  const { data: conversionRate } = useQuery<{ result: number }>({
    queryKey: ["currency-convert", group?.currency, currency],
    queryFn: () => api(`/splits/currencies/convert?amount=1&from=${group!.currency}&to=${currency}`),
    enabled: showConverted && !!group && group.currency !== currency,
  })

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => api("/splits/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: async (result: any) => {
      if (receiptFile && result?.id) {
        try { await uploadReceiptBase64(result.id, receiptFile) } catch {}
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
        try { await uploadReceiptBase64(expenseId, receiptFile) } catch {}
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
    onMutate: async ({ splitId }) => {
      await queryClient.cancelQueries({ queryKey: ["split-group", groupId] })
      const previous = queryClient.getQueryData<SplitGroup>(["split-group", groupId])
      if (previous) {
        queryClient.setQueryData<SplitGroup>(["split-group", groupId], (old) => {
          if (!old) return old
          return {
            ...old,
            expenses: old.expenses.map(e => ({
              ...e,
              splits: e.splits.map(s =>
                s.id === splitId ? { ...s, isPaid: !s.isPaid, paidAt: s.isPaid ? undefined : new Date().toISOString() } : s
              ),
            })),
          }
        })
      }
      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["split-group", groupId], context.previous)
      }
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-balances", groupId] })
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

  const [inviteResult, setInviteResult] = useState<{ message: string; inviteUrl: string; pending: boolean } | null>(null)

  const inviteMutation = useMutation({
    mutationFn: (data: any) => api(`/splits/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["split-group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["split-invitations", groupId] })
      if (result?.pending) {
        setInviteResult(result)
        setInviteEmail("")
      } else {
        setShowInviteForm(false)
        setInviteEmail("")
        setInviteResult(null)
        addToast({ title: "Miembro invitado", variant: "success" })
      }
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => api(`/splits/invitations/${invitationId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-invitations", groupId] })
      addToast({ title: "Invitacion cancelada", variant: "success" })
    },
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
    setExpenseForm({ title: "", description: "", amount: "", date: new Date().toISOString().split("T")[0], splitType: "EQUAL", selectedMembers: [], percentages: {}, exactAmounts: {}, paidBy: "" })
  }

  async function uploadReceiptBase64(expenseId: string, file: File) {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(",")[1])
      }
      reader.readAsDataURL(file)
    })
    await api(`/splits/expenses/${expenseId}/receipt`, {
      method: "POST",
      body: JSON.stringify({ receiptData: base64, receiptMime: file.type }),
    })
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
      paidBy: expense.paidBy.id,
    })
    if (expense.receiptData && expense.receiptMime) setReceiptPreview(`data:${expense.receiptMime};base64,${expense.receiptData}`)
    else if (expense.receiptUrl) setReceiptPreview(`${API_BASE}${expense.receiptUrl}`)
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
      paidById: expenseForm.paidBy || undefined,
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

  function formatAmount(amount: number, amountCurrency: string) {
    if (showConverted && conversionRate && amountCurrency === group?.currency) {
      return formatMoney(amount * conversionRate.result, currency)
    }
    return formatMoney(amount, amountCurrency)
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
          <h1 className="text-xl sm:text-2xl font-semibold truncate">{group.name}</h1>
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

      <Modal open={showEditGroup} onClose={() => setShowEditGroup(false)} title="Editar grupo">
        <div className="p-4 sm:p-5 space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); updateGroupMutation.mutate(editGroupForm) }} className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={editGroupForm.name} onChange={(e) => setEditGroupForm(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripcion</Label><Input value={editGroupForm.description} onChange={(e) => setEditGroupForm(prev => ({ ...prev, description: e.target.value }))} /></div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={updateGroupMutation.isPending}>Guardar</Button>
              <Button type="button" variant="outline" onClick={() => setShowEditGroup(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      </Modal>

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
          {group && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total del grupo</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatMoney(group.expenses.reduce((sum, e) => sum + e.amount, 0), group.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Tu parte</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatMoney(
                      group.expenses.reduce((sum, e) => {
                        const mySplit = e.splits.find((s) => s.userId === user?.id)
                        return sum + (mySplit?.amount || 0)
                      }, 0),
                      group.currency
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar gastos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => { resetExpenseForm(); setShowExpenseForm(true) }}>
              <Plus className="h-4 w-4 mr-2" />Nuevo gasto
            </Button>
            {templates && templates.length > 0 && (
              <div className="relative templates-dropdown">
                <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                  <FileText className="h-4 w-4 mr-2" />Usar plantilla
                </Button>
                {showTemplates && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border rounded-lg shadow-lg z-20">
                    {templates.map((tpl) => (
                      <button key={tpl.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-lg flex items-center gap-2"
                        onClick={() => {
                          setExpenseForm(prev => ({
                            ...prev,
                            splitType: tpl.splitType as any,
                            selectedMembers: tpl.memberIds || [],
                          }))
                          setShowExpenseForm(true)
                          setShowTemplates(false)
                        }}>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{tpl.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{tpl.splitType}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Modal open={showExpenseForm} onClose={resetExpenseForm} title={editingExpense ? "Editar gasto" : "Nuevo gasto"}>
            <div className="p-4 sm:p-5 space-y-3">
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Titulo *</Label><Input placeholder="Ej: Cena, Taxi, Hotel" value={expenseForm.title} onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>Monto ({group.currency}) *</Label><Input type="number" step="0.01" min="0.01" placeholder="0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} required /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>¿Quién pago?</Label>
                    <select className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-sm" value={expenseForm.paidBy || user?.id || ""} onChange={(e) => setExpenseForm(prev => ({ ...prev, paidBy: e.target.value }))}>
                      {group.members.map((m) => (
                        <option key={m.user.id} value={m.user.id}>{m.user.name}{m.user.id === user?.id ? " (tu)" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      const memberColor = getMemberColor(m.user.id, group.members)
                      return (
                        <div key={m.user.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-gray-200 dark:border-gray-700"}`}
                          onClick={() => toggleMemberSelection(m.user.id)}>
                          <div className={`h-8 w-8 rounded-full ${memberColor.bg} flex items-center justify-center ${memberColor.text} text-sm font-medium shrink-0`}>
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
                  {editingExpense && (
                    <Button type="button" variant="ghost" size="sm" onClick={async () => {
                      try {
                        await api("/splits/templates", { method: "POST", body: JSON.stringify({
                          name: expenseForm.title,
                          splitType: expenseForm.splitType,
                          memberIds: expenseForm.selectedMembers.length > 0 ? expenseForm.selectedMembers : group.members.map(m => m.user.id),
                        })})
                        addToast({ title: "Plantilla guardada", variant: "success" })
                        queryClient.invalidateQueries({ queryKey: ["split-templates"] })
                      } catch (err: any) {
                        addToast({ title: "Error", description: err.message, variant: "error" })
                      }
                    }}>
                      Guardar como plantilla
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={resetExpenseForm}>Cancelar</Button>
                </div>
              </form>
            </div>
          </Modal>

          {filteredExpenses.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{search ? "Sin resultados" : "Sin gastos aun"}</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {(() => {
                const grouped: Record<string, SharedExpense[]> = {}
                filteredExpenses.forEach(expense => {
                  const dateKey = new Date(expense.date).toISOString().split('T')[0]
                  if (!grouped[dateKey]) grouped[dateKey] = []
                  grouped[dateKey].push(expense)
                })

                return Object.entries(grouped).map(([dateKey, expenses]) => {
                  const date = new Date(dateKey)
                  const today = new Date()
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)

                  let dateLabel = formatDateShort(date)
                  if (date.toDateString() === today.toDateString()) dateLabel = "Hoy"
                  else if (date.toDateString() === yesterday.toDateString()) dateLabel = "Ayer"

                  return (
                    <div key={dateKey} className="space-y-3">
                      <div className="flex items-center gap-2 sticky top-16 z-10 bg-gray-50 dark:bg-gray-950 py-2">
                        <span className="text-xs font-medium text-gray-500">{dateLabel}</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                      </div>
                      {expenses.map((expense) => (
                        <Card key={expense.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailExpense(expense)} tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailExpense(expense) } }}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`h-10 w-10 rounded-full ${getMemberColor(expense.paidBy.id, group.members).bg} flex items-center justify-center ${getMemberColor(expense.paidBy.id, group.members).text} text-sm font-medium shrink-0`}>
                                  {expense.paidBy.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold truncate">{expense.title}</p>
                                    {expense.receiptData && <Receipt className="h-3 w-3 text-blue-500 shrink-0" />}
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
                                <div className="relative">
                                  <button onClick={(e) => { e.stopPropagation(); setMenuExpenseId(menuExpenseId === expense.id ? null : expense.id) }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                  {menuExpenseId === expense.id && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                      <button onClick={() => { setMenuExpenseId(null); setDetailExpense(expense) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Ver detalle</button>
                                      {(user?.id === expense.paidBy.id || user?.id === group.createdBy.id) && (
                                        <>
                                          <button onClick={() => { setMenuExpenseId(null); startEditExpense(expense) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Editar</button>
                                          <button onClick={() => { setMenuExpenseId(null); setDeleteExpenseId(expense.id) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-red-600">Eliminar</button>
                                        </>
                                      )}
                                      <button onClick={() => {
                                        setMenuExpenseId(null)
                                        setEditingExpense(null)
                                        setShowExpenseForm(true)
                                        setExpenseForm({
                                          title: expense.title,
                                          description: expense.description || "",
                                          amount: String(expense.amount),
                                          date: new Date().toISOString().split("T")[0],
                                          splitType: expense.splitType as any,
                                          selectedMembers: expense.splits.map(s => s.userId),
                                          percentages: Object.fromEntries(expense.splits.filter(s => s.percentage).map(s => [s.userId, String(s.percentage)])),
                                          exactAmounts: Object.fromEntries(expense.splits.map(s => [s.userId, String(s.amount)])),
                                          paidBy: expense.paidBy.id,
                                        })
                                      }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Duplicar</button>
                                      <button onClick={() => {
                                        setMenuExpenseId(null)
                                        const text = `${expense.title}: ${formatMoney(expense.amount, expense.currency)} pagado por ${expense.paidBy.name}. Divisiones: ${expense.splits.map(s => `${s.user.name} ${formatMoney(s.amount, expense.currency)}`).join(', ')}`
                                        navigator.clipboard.writeText(text)
                                        addToast({ title: "Copiado", variant: "success" })
                                      }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Compartir</button>
                                    </div>
                                  )}
                                </div>
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
                  )
                })
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === "balances" && (
        <div className="space-y-4">
          {(() => {
            const membersOwed = balances?.netBalances?.filter((b) => b.amount > 0.01) || []
            const hasDebts = membersOwed.length > 0
            return (
              <>
                <div className="flex justify-end gap-2">
                  {group.currency !== currency && (
                    <Button variant="outline" size="sm" onClick={() => setShowConverted(!showConverted)}>
                      {showConverted ? `Mostrar en ${group.currency}` : `Mostrar en ${currency}`}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      if (!hasDebts) {
                        addToast({ title: "Sin deudas pendientes", description: "Todos los miembros estan al dia. No hay nada que pagar.", variant: "warning" })
                        return
                      }
                      setShowSettlementForm(!showSettlementForm)
                      setFormError("")
                      setSettlementForm({ toUserId: "", amount: "", notes: "" })
                    }}
                    disabled={!hasDebts}
                    className={!hasDebts ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    <Send className="h-4 w-4 mr-2" />Registrar pago
                  </Button>
                  {(() => {
                    const myConsumption = user ? getDirectConsumption(user.id, group.expenses, group.members, group.settlements) : []
                    const pendingItems = myConsumption.filter(c => c.pending > 0.01)
                    return pendingItems.length > 0 ? (
                      <>
                        <Button variant="outline" onClick={() => setShowLiquidateConfirm(true)}>
                          Liquidar todo ({pendingItems.length})
                        </Button>
                        <ConfirmAction
                          open={showLiquidateConfirm}
                          onOpenChange={setShowLiquidateConfirm}
                          title="Liquidar todas las deudas"
                          description={`Liquidar ${pendingItems.length} deudas por un total de ${formatMoney(pendingItems.reduce((sum, c) => sum + c.pending, 0), group.currency)}?`}
                          confirmLabel="Liquidar todo"
                          onConfirm={async () => {
                            for (const c of pendingItems) {
                              await createSettlementMutation.mutateAsync({
                                groupId, toUserId: c.user.id, amount: c.pending, notes: "Liquidacion automatica"
                              })
                            }
                            setShowLiquidateConfirm(false)
                          }}
                          loading={createSettlementMutation.isPending}
                        />
                      </>
                    ) : null
                  })()}
                </div>
                {!hasDebts && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Scale className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Todos estan al dia</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">No hay deudas pendientes en este grupo</p>
                    </div>
                  </div>
                )}
                <Modal open={showSettlementForm} onClose={() => setShowSettlementForm(false)} title="Registrar pago">
                  <div className="p-4 sm:p-5 space-y-3">
                    {(() => {
                      const availableMembers = group.members.filter((m) => {
                        if (m.user.id === user?.id) return false
                        const memberBalance = balances?.netBalances?.find((b) => b.userId === m.user.id)
                        return memberBalance && memberBalance.amount > 0
                      })
                      if (availableMembers.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                              <Scale className="h-6 w-6 text-emerald-600" />
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">No puedes hacer pagos</p>
                            <p className="text-sm text-muted-foreground mt-1">No debes dinero a ningun miembro del grupo</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowSettlementForm(false)}>Cerrar</Button>
                          </div>
                        )
                      }
                      return (
                        <form onSubmit={(e) => { e.preventDefault(); setFormError(""); if (!settlementForm.toUserId || !settlementForm.amount) return; createSettlementMutation.mutate({ groupId, toUserId: settlementForm.toUserId, amount: parseFloat(settlementForm.amount), notes: settlementForm.notes || undefined }) }} className="space-y-4">
                          <div className="space-y-2"><Label>Pagar a</Label>
                            <select className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-sm" value={settlementForm.toUserId} onChange={(e) => setSettlementForm(prev => ({ ...prev, toUserId: e.target.value }))} required>
                              <option value="">Seleccionar...</option>
                              {availableMembers.map((m) => (<option key={m.user.id} value={m.user.id}>{m.user.name}</option>))}
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
                      )
                    })()}
                  </div>
                </Modal>
                {(() => {
                  const myConsumption = user ? getDirectConsumption(user.id, group.expenses, group.members, group.settlements) : []
                  const hasConsumption = myConsumption.length > 0
                  const totalConsumption = myConsumption.filter(c => c.pending > 0).reduce((sum, c) => sum + c.pending, 0)

                  if (!hasConsumption && (!balances?.simplifiedDebts || balances.simplifiedDebts.length === 0)) {
                    return (
                      <Card><CardContent className="py-12 text-center"><Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Todos estan al dia</p><p className="text-sm text-muted-foreground mt-1">No hay deudas pendientes</p></CardContent></Card>
                    )
                  }

                  return (
                    <>
                      {hasConsumption && (
                        <div className="space-y-3">
                          {myConsumption.filter(c => c.pending > 0.01).length > 0 && (
                            <>
                              <p className="text-sm font-medium text-muted-foreground">Lo que debes por persona</p>
                              {myConsumption.filter(c => c.pending > 0.01).map((c) => (
                                <Card key={c.user.id}><CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm">{c.user.name?.charAt(0)?.toUpperCase()}</div>
                                      <div>
                                        <p className="font-medium">{c.user.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {c.iOweBreakdown.map((b, i) => (
                                            <span key={i}>{b.title} {formatAmount(b.amount, group.currency)}{i < c.iOweBreakdown.length - 1 ? " + " : ""}</span>
                                          ))}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl font-bold text-red-600">{formatAmount(c.pending, group.currency)}</span>
                                      <Button size="sm" variant="outline" onClick={() => {
                                        setShowSettlementForm(true)
                                        setSettlementForm({ toUserId: c.user.id, amount: String(c.pending), notes: "" })
                                      }}>
                                        Pagar
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent></Card>
                              ))}
                              <div className="flex justify-end pt-1">
                                <p className="text-sm font-medium text-muted-foreground">Total pendiente: <span className="text-red-600">{formatAmount(totalConsumption, group.currency)}</span></p>
                              </div>
                            </>
                          )}

                          {myConsumption.filter(c => c.pending < -0.01).length > 0 && (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Te deben</p>
                              {myConsumption.filter(c => c.pending < -0.01).map((c) => (
                                <Card key={c.user.id}><CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">{c.user.name?.charAt(0)?.toUpperCase()}</div>
                                      <div>
                                        <p className="font-medium">{c.user.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {c.theyOweBreakdown.map((b, i) => (
                                            <span key={i}>{b.title} {formatAmount(b.amount, group.currency)}{i < c.theyOweBreakdown.length - 1 ? " + " : ""}</span>
                                          ))}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl font-bold text-emerald-600">{formatAmount(Math.abs(c.pending), group.currency)}</span>
                                    </div>
                                  </div>
                                </CardContent></Card>
                              ))}
                            </div>
                          )}

                          {myConsumption.filter(c => Math.abs(c.pending) <= 0.01 && (c.iOwe > 0.01 || c.theyOweMe > 0.01)).length > 0 && (
                            <div className="space-y-3 pt-2">
                              <p className="text-sm font-medium text-muted-foreground">Saldados</p>
                              {myConsumption.filter(c => Math.abs(c.pending) <= 0.01 && (c.iOwe > 0.01 || c.theyOweMe > 0.01)).map((c) => (
                                <Card key={c.user.id} className="opacity-60"><CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">{c.user.name?.charAt(0)?.toUpperCase()}</div>
                                      <div>
                                        <p className="font-medium">{c.user.name} ✓</p>
                                        <p className="text-xs text-muted-foreground">
                                          {c.iOwe > 0.01 && `Debes: ${formatAmount(c.iOwe, group.currency)}`}
                                          {c.theyOweMe > 0.01 && ` | Te debe: ${formatAmount(c.theyOweMe, group.currency)}`}
                                          {c.settled > 0.01 && ` | Pagado: ${formatAmount(c.settled, group.currency)}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-emerald-600">Saldado</span>
                                    </div>
                                  </div>
                                </CardContent></Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {balances?.simplifiedDebts && balances.simplifiedDebts.length > 0 && (
                        <div className="pt-2">
                          <button
                            onClick={() => setShowOptimalTransfers(!showOptimalTransfers)}
                            className="flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors w-full"
                          >
                            {showOptimalTransfers ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <span>Ver transferencias optimas (modo informativo)</span>
                          </button>
                          {showOptimalTransfers && (
                            <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                              <p className="text-[11px] text-muted-foreground/70 mb-3 leading-relaxed">
                                Esta sección muestra el número mínimo de pagos necesarios para saldar todas las deudas.
                                Los montos pueden diferir del consumo directo porque se basan en cuánto prestó realmente cada persona al grupo (lo que pagó menos lo que consumió).
                              </p>
                              <div className="space-y-2">
                              {balances.simplifiedDebts.map((debt, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/20">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 dark:text-red-500 text-[10px] font-medium">{debt.fromName?.charAt(0)?.toUpperCase()}</div>
                                    <span className="text-xs text-muted-foreground/70">{debt.fromName}</span>
                                    <span className="text-[10px] text-muted-foreground/50">→</span>
                                    <span className="text-xs text-muted-foreground/70">{debt.toName}</span>
                                    <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-400 dark:text-emerald-500 text-[10px] font-medium">{debt.toName?.charAt(0)?.toUpperCase()}</div>
                                  </div>
                                  <span className="text-xs font-medium text-muted-foreground/60">{formatAmount(debt.amount, group.currency)}</span>
                                </div>
                              ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            )
          })()}
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
                <span className="font-bold text-emerald-600">{formatAmount(s.amount, group.currency)}</span>
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
          <Modal open={showInviteForm} onClose={() => { setShowInviteForm(false); setInviteResult(null) }} title="Invitar miembro">
            <div className="p-4 sm:p-5 space-y-3">
              {inviteResult ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Invitacion enviada</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{inviteResult.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(inviteResult.inviteUrl); addToast({ title: "Enlace copiado", variant: "success" }) }}>
                      Copiar enlace
                    </Button>
                    <Button variant="outline" size="sm" className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Te he invitado a unirte al grupo "${group.name}" en Zentra. Registrate aqui: ${inviteResult.inviteUrl}`)}`, '_blank', 'noopener,noreferrer')}>
                      Compartir por WhatsApp
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => { setInviteResult(null); setInviteEmail("") }}>Invitar a otro</Button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); if (!inviteEmail.trim()) return; inviteMutation.mutate({ email: inviteEmail.trim() }) }} className="space-y-4">
                  <div className="space-y-2"><Label>Email del usuario</Label><Input type="email" placeholder="email@ejemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required /></div>
                  <p className="text-xs text-muted-foreground">Si el usuario no esta registrado en Zentra, recibira un email con un enlace para registrarse y unirse al grupo.</p>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={inviteMutation.isPending}>{inviteMutation.isPending ? "Invitando..." : "Invitar"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>Cancelar</Button>
                  </div>
                </form>
              )}
            </div>
          </Modal>
          <div className="space-y-3">
            {group.members.map((m) => (
              <Card key={m.user.id}><CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${getMemberColor(m.user.id, group.members).bg} flex items-center justify-center ${getMemberColor(m.user.id, group.members).text} text-sm font-medium`}>{m.user.name?.charAt(0)?.toUpperCase()}</div>
                  <div><p className="font-medium">{m.user.name}</p><p className="text-xs text-muted-foreground capitalize">{m.role === "ADMIN" ? "Creador" : "Miembro"}</p></div>
                </div>
                {m.user.id !== user?.id && user?.id === group.createdBy.id && (
                  <button onClick={() => setDeleteMemberId(m.user.id)} className="text-muted-foreground hover:text-red-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"><UserMinus className="h-4 w-4" /></button>
                )}
              </CardContent></Card>
            ))}
          </div>
          {pendingInvitations && pendingInvitations.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Invitaciones pendientes</p>
              {pendingInvitations.map((inv) => (
                <Card key={inv.id}><CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">{inv.email.charAt(0)?.toUpperCase()}</div>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">Invitado por {inv.inviter.name} · Expira {formatDateShort(new Date(inv.expiresAt))}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Te he invitado a unirte al grupo "${group.name}" en Zentra. Registrate aqui: ${window.location.origin}/login?invite=${inv.token}`)}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Compartir por WhatsApp">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                    {user?.id === group.createdBy.id && (
                      <button onClick={() => cancelInvitationMutation.mutate(inv.id)} className="text-muted-foreground hover:text-red-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Cancelar invitacion">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "recurring" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowRecurringForm(!showRecurringForm); setFormError("") }}><Plus className="h-4 w-4 mr-2" />Nuevo recurrente</Button>
          </div>
          <Modal open={showRecurringForm} onClose={() => setShowRecurringForm(false)} title="Gasto recurrente">
            <div className="p-4 sm:p-5 space-y-3">
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
            </div>
          </Modal>
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
                    <button onClick={() => setDeleteRecurringId(r.id)} className="text-muted-foreground hover:text-red-500 p-2"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={!!detailExpense} onClose={() => setDetailExpense(null)} title={detailExpense?.title || ""} maxWidth="sm:max-w-lg">
        <div className="p-4 space-y-4">
          {detailExpense?.description && <p className="text-sm text-muted-foreground">{detailExpense.description}</p>}
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Monto total</span><span className="text-xl font-bold">{formatMoney(detailExpense?.amount || 0, detailExpense?.currency || group.currency)}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Pagado por</span><span className="font-medium">{detailExpense?.paidBy.name}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Fecha</span><span className="font-medium">{detailExpense ? formatDateShort(new Date(detailExpense.date)) : ""}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Tipo</span><span className="font-medium">{detailExpense?.splitType === "EQUAL" ? "Igual para todos" : detailExpense?.splitType === "PERCENTAGE" ? "Por porcentaje" : "Monto exacto"}</span></div>
          {detailExpense?.receiptData && detailExpense?.receiptMime && (
            <div><p className="text-sm text-muted-foreground mb-2">Ticket/factura</p>
              {detailExpense.receiptMime === "application/pdf" ? (
                <a href={`data:application/pdf;base64,${detailExpense.receiptData}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline"><FileText className="h-5 w-5" />Ver PDF</a>
              ) : (
                <button onClick={() => setZoomImage(`data:${detailExpense.receiptMime};base64,${detailExpense.receiptData}`)} className="block cursor-pointer hover:opacity-80 transition-opacity w-full">
                  <img src={`data:${detailExpense.receiptMime};base64,${detailExpense.receiptData}`} alt="Ticket" className="w-full max-h-64 object-contain rounded-lg border" />
                </button>
              )}
            </div>
          )}
          <div><p className="text-sm font-medium mb-2">Divisiones</p>
            <div className="space-y-2">
              {detailExpense?.splits.map((split) => (
                <div key={split.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full ${getMemberColor(split.userId, group.members).bg} flex items-center justify-center ${getMemberColor(split.userId, group.members).text} text-xs font-medium`}>{split.user.name?.charAt(0)?.toUpperCase()}</div>
                    <span className="text-sm">{split.user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatMoney(split.amount, detailExpense?.currency || group.currency)}</span>
                    {(user?.id === detailExpense?.paidBy.id || user?.id === split.userId) && (
                      <Button size="sm" variant={split.isPaid ? "ghost" : "outline"} className={`h-7 text-xs ${split.isPaid ? "text-emerald-600 hover:text-red-500" : ""}`}
                        onClick={() => markSplitPaidMutation.mutate({ expenseId: detailExpense!.id, splitId: split.id })} disabled={markSplitPaidMutation.isPending}>
                        {split.isPaid ? "Pagado ✓" : "Marcar pagado"}
                      </Button>
                    )}
                    {!split.isPaid && (user?.id !== detailExpense?.paidBy.id && user?.id !== split.userId) && (
                      <span className="text-xs text-amber-600">Pendiente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {detailExpense?.items && detailExpense.items.length > 0 && (
            <div><p className="text-sm font-medium mb-2">Items</p>
              <div className="space-y-1">
                {detailExpense.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <span className="text-sm">{item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}</span>
                    <span className="text-sm font-medium">{formatMoney(item.amount, detailExpense?.currency || group.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(user?.id === detailExpense?.paidBy.id || user?.id === group.createdBy.id) && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => { const exp = detailExpense; setDetailExpense(null); if (exp) startEditExpense(exp) }}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              <Button variant="outline" size="sm" className="text-red-500" onClick={() => { const id = detailExpense?.id; setDetailExpense(null); if (id) setDeleteExpenseId(id) }}><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmAction open={deleteExpenseId !== null} onOpenChange={(open) => !open && setDeleteExpenseId(null)} title="Eliminar gasto" description="Esta accion no se puede deshacer." confirmLabel="Eliminar" onConfirm={() => deleteExpenseId && deleteExpenseMutation.mutate(deleteExpenseId)} loading={deleteExpenseMutation.isPending} />
      <ConfirmAction open={deleteGroupId} onOpenChange={setDeleteGroupId} title="Eliminar grupo" description="Todos los gastos y balances se perderan permanentemente." confirmLabel="Eliminar grupo" onConfirm={() => deleteGroupMutation.mutate()} loading={deleteGroupMutation.isPending} />
      <ConfirmAction open={deleteMemberId !== null} onOpenChange={(open) => !open && setDeleteMemberId(null)} title="Remover miembro" description="El miembro sera removido del grupo." confirmLabel="Remover" onConfirm={() => deleteMemberId && removeMemberMutation.mutate(deleteMemberId)} loading={removeMemberMutation.isPending} />
      <ConfirmAction open={deleteRecurringId !== null} onOpenChange={(open) => !open && setDeleteRecurringId(null)} title="Eliminar gasto recurrente" description="Esta accion no se puede deshacer." confirmLabel="Eliminar" onConfirm={() => deleteRecurringId && deleteRecurringMutation.mutate(deleteRecurringId)} loading={deleteRecurringMutation.isPending} />

      {zoomImage && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-2 sm:p-4 cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <button onClick={() => setZoomImage(null)} className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white/80 hover:text-white z-10 p-2"><X className="h-6 w-6 sm:h-8 sm:w-8" /></button>
          <img src={zoomImage} alt="Ticket ampliado" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
