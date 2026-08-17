"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ConfirmAction } from "@/components/ui/confirm-dialog"
import { getUser } from "@/lib/api"
import { useRouter } from "next/navigation"
import {
  Shield,
  Users,
  UserCheck,
  Crown,
  Home,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Trash2,
  ChevronDown,
  Search,
  MoreVertical,
} from "lucide-react"
import { Modal } from "@/components/ui/modal"

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  familyId: string | null
  familyName: string | null
  plan: string
  planStatus: string
  transactionCount: number
}

interface Stats {
  totalUsers: number
  freeUsers: number
  proUsers: number
  familyUsers: number
  totalTransactions: number
  totalFamilies: number
  totalIncome: number
  totalExpense: number
}

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pro: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  family: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

const planLabels: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  family: "Familia",
}

export default function AdminPage() {
  const router = useRouter()
  const user = getUser()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; userName: string } | null>(null)

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/dashboard")
    }
  }, [user, router])

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => api("/admin/stats"),
  })

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["admin-users", search],
    queryFn: () => api(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  })

  const updatePlan = useMutation({
    mutationFn: ({ userId, plan }: { userId: string; plan: string }) =>
      api(`/admin/users/${userId}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan }),
      }),
    onSuccess: () => {
      addToast({ title: "Plan actualizado", description: "El plan del usuario ha sido cambiado.", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      setOpenMenu(null)
    },
    onError: (err: Error) => {
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const deleteUser = useMutation({
    mutationFn: (userId: string) =>
      api(`/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      addToast({ title: "Usuario eliminado", description: "La cuenta ha sido eliminada.", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      setOpenMenu(null)
    },
    onError: (err: Error) => {
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  function handleDelete(userId: string, userName: string) {
    setDeleteConfirm({ userId, userName })
  }

  if (!user || user.role !== "ADMIN") return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Panel de Administracion</h1>
          <p className="text-sm text-muted-foreground">Gestiona usuarios, planes y estadisticas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalUsers ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.freeUsers ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Gratis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Crown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.proUsers ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Pro</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <Home className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.familyUsers ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Familia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Transacciones</p>
            <p className="text-xl font-bold">{stats?.totalTransactions ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Familias</p>
            <p className="text-xl font-bold">{stats?.totalFamilies ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-xs text-muted-foreground">Ingresos</p>
            </div>
            <p className="text-xl font-bold">{stats?.totalIncome?.toLocaleString("en-US", { style: "currency", currency: "USD" }) ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              <p className="text-xs text-muted-foreground">Gastos</p>
            </div>
            <p className="text-xl font-bold">{stats?.totalExpense?.toLocaleString("en-US", { style: "currency", currency: "USD" }) ?? "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-3 pb-4">
          <CardTitle className="text-lg">Usuarios</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="p-6 text-center text-muted-foreground">Cargando...</div>
          ) : !users?.length ? (
            <div className="p-6 text-center text-muted-foreground">No se encontraron usuarios</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{u.name}</p>
                      {u.role === "ADMIN" && (
                        <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">ADMIN</span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${planColors[u.plan] || planColors.free}`}>
                        {planLabels[u.plan] || "Gratis"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <button
                    onClick={() => setOpenMenu(u.id)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                    aria-label={`Acciones para ${u.name}`}
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Modal */}
      {openMenu && (() => {
        const selectedUser = users?.find(u => u.id === openMenu)
        if (!selectedUser) return null
        return (
          <Modal open={!!openMenu} onClose={() => setOpenMenu(null)} title={`Acciones: ${selectedUser.name}`} maxWidth="sm:max-w-sm">
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                  {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-1">Cambiar plan</p>
                {["free", "pro", "family"].map((plan) => (
                  <button
                    key={plan}
                    onClick={() => updatePlan.mutate({ userId: selectedUser.id, plan })}
                    disabled={selectedUser.plan === plan}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      selectedUser.plan === plan
                        ? "bg-primary/10 text-primary font-medium cursor-default"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {planLabels[plan]}
                    {selectedUser.plan === plan && " ✓"}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <button
                  onClick={() => { setOpenMenu(null); handleDelete(selectedUser.id, selectedUser.name) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar cuenta
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      <ConfirmAction
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteUser.mutate(deleteConfirm.userId)
            setDeleteConfirm(null)
          }
        }}
        title="Eliminar cuenta"
        description={`Estas seguro de que quieres eliminar la cuenta de "${deleteConfirm?.userName}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  )
}