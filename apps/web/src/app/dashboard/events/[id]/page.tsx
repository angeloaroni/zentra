"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useSettings, formatMoney, getCurrencySymbol, formatDateShort, formatMonthYear, useHasHydrated, useMounted } from "@/lib/settings"
import { useFamilyStore } from "@/lib/family"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

interface Transaction {
  id: string
  type: string
  title: string
  amount: number
  currency: string
  date: string
  category: { id: string; name: string; color: string; icon: string }
  user?: { id: string; name: string }
}

interface TagDetail {
  id: string
  name: string
  color: string
  icon: string
  budget: number | null
  familyId: string | null
  stats: {
    spent: number
    transactionCount: number
    firstDate: string | null
    lastDate: string | null
    averagePerTransaction: number
  }
  transactions: Transaction[]
}

function formatDate(d: string) {
  return formatDateShort(d)
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

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { currency } = useSettings()
  const hydrated = useHasHydrated()
  const mounted = useMounted()
  const { activeFamilyId } = useFamilyStore()
  const [showEdit, setShowEdit] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({
    name: "",
    color: "",
    icon: "",
    budget: "",
  })

  const { data: tag, isLoading } = useQuery<TagDetail>({
    queryKey: ["tags", params.id, activeFamilyId],
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (activeFamilyId) searchParams.set("familyId", activeFamilyId)
      const query = searchParams.toString() ? `?${searchParams}` : ""
      return api(`/tags/${params.id}/details${query}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api(`/tags/${params.id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      setShowEdit(false)
      setFormError("")
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api(`/tags/${params.id}`, { method: "DELETE" }),
    onSuccess: () => {
      router.push("/dashboard/events")
    },
  })

  function handleEdit() {
    if (!tag) return
    setForm({
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      budget: tag.budget?.toString() || "",
    })
    setShowEdit(true)
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!form.name.trim()) {
      setFormError("El nombre es requerido")
      return
    }
    updateMutation.mutate({
      name: form.name.trim(),
      color: form.color,
      icon: form.icon,
      budget: form.budget ? parseFloat(form.budget) : null,
    })
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

  if (!mounted || !hydrated) {
    return <div className="space-y-6"><p className="text-center text-muted-foreground py-8">Cargando...</p></div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      </div>
    )
  }

  if (!tag) {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground py-8">Evento no encontrado</p>
        <Link href="/dashboard/events">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a eventos
          </Button>
        </Link>
      </div>
    )
  }

  const hasBudget = tag.budget && tag.budget > 0
  const percentage = hasBudget && tag.budget
    ? Math.min((tag.stats?.spent || 0) / tag.budget * 100, 100)
    : 0
  const now = new Date()
  const monthName = formatMonthYear(now)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/events">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate()}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      {showEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Editar evento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
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
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
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
                      className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
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
                <Label>Presupuesto mensual</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Sin límite"
                  value={form.budget}
                  onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowEdit(false); setFormError("") }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ backgroundColor: tag.color }}
                >
                  {renderTagIcon(tag.icon)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{tag.name}</h1>
                  <p className="text-muted-foreground capitalize">{monthName}</p>
                </div>
              </div>

              {hasBudget ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">
                      {formatMoney(tag.stats?.spent || 0, currency)}
                    </span>
                    <span className="text-muted-foreground">
                      de {formatMoney(tag.budget || 0, currency)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className={`text-sm font-medium ${getProgressTextColor(percentage)}`}>
                    {percentage.toFixed(0)}% usado
                  </p>
                </div>
              ) : (
                <div className="text-lg">
                  <span className="text-muted-foreground">Presupuesto: </span>
                  <span className="font-medium">Sin límite</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Este mes · {tag.stats?.transactionCount || 0} transacciones
                </CardTitle>
                <Link href={`/dashboard/transactions?tagId=${tag.id}`}>
                  <Button variant="ghost" size="sm">
                    Ver todas
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {tag.transactions && tag.transactions.length > 0 ? (
                <div className="divide-y">
                  {tag.transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: tx.category?.color || "#6b7280" }}
                        >
                          {tx.category?.icon?.charAt(0)?.toUpperCase() || "$"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.category?.name} · {formatDate(tx.date)}
                            {(tx as any).user && ` · ${(tx as any).user.name}`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatMoney(tx.amount, tx.currency || currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">
                  Sin transacciones este mes
                </p>
              )}
            </CardContent>
          </Card>

          {tag.stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {tag.stats.firstDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primera transacción</span>
                    <span>{formatDate(tag.stats.firstDate)}</span>
                  </div>
                )}
                {tag.stats.lastDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última transacción</span>
                    <span>{formatDate(tag.stats.lastDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promedio por gasto</span>
                  <span>{formatMoney(tag.stats.averagePerTransaction || 0, currency)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Link href={`/dashboard/transactions?tagId=${tag.id}&showForm=true`}>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Añadir transacción a este evento
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}
