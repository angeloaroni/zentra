"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useFamilyStore } from "@/lib/family"
import { useSettings, getCurrencySymbol, formatMoney, useHasHydrated, useMounted } from "@/lib/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Target } from "lucide-react"

interface Goal {
  id: string
  name: string
  description?: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  icon?: string
  color?: string
}

const PRESET_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#EF4444",
  "#F59E0B", "#6366F1", "#14B8A6", "#EC4899",
]

export default function GoalsPage() {
  const queryClient = useQueryClient()
  const { activeFamilyId } = useFamilyStore()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const [showForm, setShowForm] = useState(false)
  const [contributeId, setContributeId] = useState<string | null>(null)
  const [contributeAmount, setContributeAmount] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    targetAmount: "",
    deadline: "",
    color: PRESET_COLORS[0],
  })

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["goals", activeFamilyId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (activeFamilyId) params.set("familyId", activeFamilyId)
      return api(`/goals?${params}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api("/goals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      setShowForm(false)
      setForm({ name: "", description: "", targetAmount: "", deadline: "", color: PRESET_COLORS[0] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })

  const contributeMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api(`/goals/${id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      setContributeId(null)
      setContributeAmount("")
    },
  })

  if (!mounted || !hydrated) {
    return <div className="space-y-6"><p className="text-center text-muted-foreground py-8">Cargando...</p></div>
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      targetAmount: parseFloat(form.targetAmount),
      familyId: activeFamilyId ? activeFamilyId : null,
    })
  }

  function handleContribute(id: string) {
    const amount = parseFloat(contributeAmount)
    if (amount > 0) {
      contributeMutation.mutate({ id, amount })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nueva meta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej: Viaje a Europa"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Monto objetivo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.targetAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha limite (opcional)</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripcion (opcional)</Label>
                <Input
                  placeholder="Descripcion..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
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
                        form.color === c
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm(prev => ({ ...prev, color: c }))}
                    />
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
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
      ) : !goals?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sin metas aun</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea una meta para empezar a ahorrar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percentage = goal.targetAmount > 0
              ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
              : 0
            const isComplete = goal.currentAmount >= goal.targetAmount
            const daysLeft = goal.deadline
              ? Math.ceil(
                  (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              : null

            return (
              <Card key={goal.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: goal.color || "#6b7280" }}
                      >
                        {goal.icon?.charAt(0)?.toUpperCase() || "G"}
                      </div>
                      <div>
                        <p className="font-semibold">{goal.name}</p>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(goal.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{formatMoney(goal.currentAmount, currency)}</span>
                      <span className="text-muted-foreground">
                        {formatMoney(goal.targetAmount, currency)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          isComplete ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(0)}%</span>
                      {daysLeft !== null && (
                        <span>
                          {daysLeft > 0
                            ? `${daysLeft} dias restantes`
                            : isComplete
                            ? "Completada"
                            : "Vencida"}
                        </span>
                      )}
                    </div>
                  </div>

                  {contributeId === goal.id ? (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Monto"
                        value={contributeAmount}
                        onChange={(e) => setContributeAmount(e.target.value)}
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleContribute(goal.id)}
                        disabled={contributeMutation.isPending}
                      >
                        Aportar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setContributeId(null)
                          setContributeAmount("")
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => setContributeId(goal.id)}
                      disabled={isComplete}
                    >
                      {isComplete ? "Meta completada" : "Aportar"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
