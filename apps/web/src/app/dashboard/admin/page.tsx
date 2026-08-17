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
} from "lucide-react"

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

      {/* Users table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Usuarios</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Nombre</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Plan</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Familia</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden lg:table-cell">Registros</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Fecha</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</td></tr>
                ) : !users?.length ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron usuarios</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                          </div>
                          {u.role === "ADMIN" && (
                            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell">{u.email}</td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${planColors[u.plan] || planColors.free}`}>
                          {planLabels[u.plan] || "Gratis"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                        {u.familyName || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell">{u.transactionCount}</td>
                      <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                        {new Date(u.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-4 text-right relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          data-user-id={u.id}
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {openMenu === u.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden="true" />
                            <div className="fixed z-20 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 w-48"
                              ref={(el) => {
                                if (el) {
                                  const btn = document.querySelector(`[data-user-id="${u.id}"]`)
                                  if (btn) {
                                    const rect = btn.getBoundingClientRect()
                                    const menuHeight = 220
                                    const spaceBelow = window.innerHeight - rect.bottom
                                    if (spaceBelow < menuHeight) {
                                      el.style.top = `${rect.top - menuHeight - 4}px`
                                    } else {
                                      el.style.top = `${rect.bottom + 4}px`
                                    }
                                    el.style.left = `${Math.min(rect.right - 192, window.innerWidth - 200)}px`
                                  }
                                }
                              }}
                            >
                                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Cambiar plan</p>
                                {["free", "pro", "family"].map((plan) => (
                                  <button
                                    key={plan}
                                    onClick={() => updatePlan.mutate({ userId: u.id, plan })}
                                    disabled={u.plan === plan}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                      u.plan === plan ? "text-muted-foreground cursor-default" : ""
                                    }`}
                                  >
                                    {planLabels[plan]}
                                    {u.plan === plan && " ✓"}
                                  </button>
                                ))}
                                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                <button
                                  onClick={() => handleDelete(u.id, u.name)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  Eliminar cuenta
                                </button>
</div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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