"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useSettings, formatMoney, formatMonthYear, useHasHydrated, useMounted } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SkeletonCard } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { Plus, PartyPopper } from "lucide-react"
import Link from "next/link"

const TAG_COLORS = [
  "#3B82F6", "#6366F1", "#10B981", "#EF4444",
  "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6",
  "#0EA5E9", "#84CC16", "#F97316", "#A855F7",
]

const TAG_ICONS = [
  "cake", "gift", "heart", "star", "home", "car", "plane",
  "shopping-bag", "utensils", "coffee", "beer", "film",
  "music", "book", "briefcase", "graduation-cap", "baby", "tree-pine",
  "party-popper", "heart-handshake",
]

interface Tag {
  id: string
  name: string
  color: string
  icon: string
  budget: number | null
}

interface TagWithStats extends Tag {
  stats: {
    spent: number
    transactionCount: number
    firstDate: string | null
    lastDate: string | null
    averagePerTransaction: number
  }
}

function renderTagIcon(iconName: string) {
  const icons: Record<string, string> = {
    cake: "🎂", gift: "🎁", heart: "❤️", star: "⭐", home: "🏠",
    car: "🚗", plane: "✈️", "shopping-bag": "🛍️", utensils: "🍴",
    coffee: "☕", beer: "🍺", film: "🎬", music: "🎵", book: "📖",
    briefcase: "💼", "graduation-cap": "🎓", baby: "👶", "tree-pine": "🎄",
    "party-popper": "🎉", "heart-handshake": "💑",
  }
  return icons[iconName] || "🏷️"
}

function getProgressColor(percentage: number) {
  if (percentage >= 100) return "bg-red-500"
  if (percentage >= 80) return "bg-amber-500"
  return "bg-primary"
}

function getProgressTextColor(percentage: number) {
  if (percentage >= 100) return "text-red-600"
  if (percentage >= 80) return "text-amber-600"
  return "text-primary"
}

export default function EventsPage() {
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const { activeFamilyId } = useFamilyStore()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({
    name: "",
    color: TAG_COLORS[0],
    icon: TAG_ICONS[0],
    budget: "",
  })

  const { data: tags, isLoading } = useQuery<TagWithStats[]>({
    queryKey: ["tags", activeFamilyId],
    queryFn: () => {
      const params = activeFamilyId ? `?familyId=${activeFamilyId}` : ""
      return api(`/tags${params}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api("/tags", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      setShowForm(false)
      setFormError("")
      setForm({ name: "", color: TAG_COLORS[0], icon: TAG_ICONS[0], budget: "" })
      addToast({ title: "Evento creado", description: "Tu evento se ha creado correctamente.", variant: "success" })
    },
    onError: (err: Error) => {
      setFormError(err.message)
      addToast({ title: "Error", description: err.message || "Error al crear el evento", variant: "error" })
    },
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
      color: form.color,
      icon: form.icon,
      budget: form.budget ? parseFloat(form.budget) : null,
      familyId: activeFamilyId ? activeFamilyId : undefined,
    })
  }

  const monthName = formatMonthYear(new Date())

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PartyPopper className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">Eventos</h1>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError("") }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo evento
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nuevo evento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej: Cumpleanos de Sofia"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-9 w-9 rounded-full border-2 transition-all ${
                        form.color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm(prev => ({ ...prev, color: c }))}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Icono</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      className={`min-h-[44px] min-w-[44px] rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
                        form.icon === iconName
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-secondary"
                      }`}
                      onClick={() => setForm(prev => ({ ...prev, icon: iconName }))}
                    >
                      {renderTagIcon(iconName)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Presupuesto mensual (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Sin limite"
                  value={form.budget}
                  onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear evento"}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !tags?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sin eventos aun</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea un evento para empezar a rastrear tus gastos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => {
            const hasBudget = tag.budget && tag.budget > 0
            const spent = tag.stats?.spent || 0
            const remaining = hasBudget ? (tag.budget || 0) - spent : null
            const percentage = hasBudget && tag.budget
              ? Math.min((spent / tag.budget) * 100, 999)
              : 0

            return (
              <Link key={tag.id} href={`/dashboard/events/${tag.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="h-2" style={{ backgroundColor: tag.color }} />
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center text-2xl"
                          style={{ backgroundColor: tag.color }}
                        >
                          {renderTagIcon(tag.icon)}
                        </div>
                        <div>
                          <p className="font-semibold">{tag.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{monthName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{tag.stats?.transactionCount || 0} gastos</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {hasBudget ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gastado</span>
                            <span className={`font-medium ${getProgressTextColor(percentage)}`}>
                              {formatMoney(spent, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Presupuesto</span>
                            <span className="font-medium">{formatMoney(tag.budget || 0, currency)}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressColor(percentage)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className={getProgressTextColor(percentage)}>
                              {percentage.toFixed(0)}% usado
                            </span>
                            {remaining !== null && remaining >= 0 && (
                              <span className="text-emerald-600">
                                Restante: {formatMoney(remaining, currency)}
                              </span>
                            )}
                            {remaining !== null && remaining < 0 && (
                              <span className="text-red-600">
                                Sobrepasado: {formatMoney(Math.abs(remaining), currency)}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gastado</span>
                            <span className="font-medium">{formatMoney(spent, currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Presupuesto</span>
                            <span className="font-medium text-muted-foreground">Sin limite</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{tag.stats?.transactionCount || 0} transacciones</span>
                            {tag.stats?.averagePerTransaction ? (
                              <span className="text-muted-foreground">
                                Promedio: {formatMoney(tag.stats.averagePerTransaction, currency)}
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
