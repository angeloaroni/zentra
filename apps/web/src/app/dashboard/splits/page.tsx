"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useSettings, formatMoney, useHasHydrated, useMounted } from "@/lib/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Users, Lock, UserPlus } from "lucide-react"
import Link from "next/link"

interface SplitGroupMember {
  user: { id: string; name: string; avatar?: string }
}

interface SplitGroup {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  currency: string
  members: SplitGroupMember[]
  _count: { expenses: number }
}

interface OverallBalance {
  owedToUser: number
  userOwes: number
}

const GROUP_COLORS = [
  "#3B82F6", "#10B981", "#EF4444", "#F59E0B",
  "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1",
]

export default function SplitsPage() {
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: GROUP_COLORS[0],
  })

  const { data: groups, isLoading, isError } = useQuery<SplitGroup[]>({
    queryKey: ["split-groups"],
    queryFn: () => api("/splits/groups"),
  })

  const { data: overallBalance } = useQuery<OverallBalance>({
    queryKey: ["split-overall-balance"],
    queryFn: () => api("/splits/groups/balances/overall"),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api("/splits/groups", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-groups"] })
      setShowForm(false)
      setFormError("")
      setForm({ name: "", description: "", color: GROUP_COLORS[0] })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!form.name.trim()) {
      setFormError("El nombre es requerido")
      return
    }
    createMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color,
      currency,
    })
  }

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-semibold">Dividir gastos</h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-semibold">Error al cargar grupos</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ha ocurrido un error. Intenta de nuevo mas tarde.
            </p>
            <Link href="/dashboard/settings/billing">
              <Button className="mt-4">Ver planes</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold">Dividir gastos</h1>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError("") }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo grupo
        </Button>
      </div>

      {overallBalance && (overallBalance.owedToUser > 0 || overallBalance.userOwes > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">+</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Te deben</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatMoney(overallBalance.owedToUser, currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-lg">-</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Debes</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatMoney(overallBalance.userOwes, currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nuevo grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej: Viaje a Europa, Cena de amigos"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripcion (opcional)</Label>
                <Input
                  placeholder="Descripcion del grupo..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {GROUP_COLORS.map((c) => (
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
                <p className="text-sm text-red-500">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear grupo"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setFormError("") }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      ) : !groups?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sin grupos aun</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea un grupo para empezar a dividir gastos con amigos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/splits/${group.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-2" style={{ backgroundColor: group.color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4" />
                      <span>{group.members.length} miembros</span>
                    </div>
                    <span>{group._count.expenses} gastos</span>
                  </div>

                  <div className="mt-3 flex -space-x-2">
                    {group.members.slice(0, 5).map((m) => (
                      <div
                        key={m.user.id}
                        className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-900"
                        title={m.user.name}
                      >
                        {m.user.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    ))}
                    {group.members.length > 5 && (
                      <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-900">
                        +{group.members.length - 5}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
