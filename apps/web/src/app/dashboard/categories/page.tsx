"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useFamilyStore } from "@/lib/family"
import { useFamilyHydrated } from "@/lib/family"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Pencil, Tag } from "lucide-react"
import { useMounted } from "@/lib/settings"
import { useToast } from "@/components/ui/toast"
import { SkeletonCategoryCard } from "@/components/ui/skeleton"
import { ConfirmAction } from "@/components/ui/confirm-dialog"

const PRESET_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#EF4444",
  "#F59E0B", "#6366F1", "#14B8A6", "#EC4899",
]

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
  isDefault: boolean
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const { activeFamilyId } = useFamilyStore()
  const familyHydrated = useFamilyHydrated()
  const mounted = useMounted()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { addToast } = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState("all")
  const [formError, setFormError] = useState("")

  const defaultForm = { name: "", icon: "", color: PRESET_COLORS[0], type: "EXPENSE" }
  const [form, setForm] = useState(defaultForm)

  const { data: categories, isLoading, error: fetchError } = useQuery<Category[]>({
    queryKey: ["categories", filterType, activeFamilyId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterType !== "all") params.set("type", filterType)
      params.set("includeDefault", "true")
      if (activeFamilyId) params.set("familyId", activeFamilyId)
      return api(`/categories?${params}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api("/categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setShowForm(false)
      setFormError("")
      setForm(defaultForm)
      addToast({ title: "Categoria creada", variant: "success" })
    },
    onError: (err: Error) => {
      setFormError(err.message || "Error al crear la categoria")
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setEditingId(null)
      setShowForm(false)
      setFormError("")
      setForm(defaultForm)
      addToast({ title: "Categoria actualizada", variant: "success" })
    },
    onError: (err: Error) => {
      setFormError(err.message || "Error al actualizar la categoria")
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setDeleteId(null)
      addToast({ title: "Categoria eliminada", variant: "success" })
    },
    onError: (err: Error) => {
      setDeleteId(null)
      addToast({ title: "Error", description: err.message, variant: "error" })
    },
  })

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setShowForm(true)
    setFormError("")
    setForm({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!form.name.trim()) {
      setFormError("El nombre es requerido")
      return
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name: form.name.trim(),
          icon: form.icon.trim() || "tag",
          color: form.color,
          type: form.type,
        },
      })
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        icon: form.icon.trim() || "tag",
        color: form.color,
        type: form.type,
        familyId: activeFamilyId ? activeFamilyId : null,
      })
    }
  }

  if (!mounted || !familyHydrated) {
    return <div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <SkeletonCategoryCard key={i} />)}</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">Categorias</h1>
        <Button onClick={() => { setShowForm(!showForm); setFormError(""); setEditingId(null); setForm(defaultForm) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {editingId ? "Editar categoria" : "Nueva categoria"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej: Restaurantes"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Icono (nombre Lucide)</Label>
                <Input
                  placeholder="Ej: coffee, car, home"
                  value={form.icon}
                  onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="EXPENSE">Gasto</option>
                  <option value="INCOME">Ingreso</option>
                  <option value="BOTH">Ambos</option>
                </select>
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

              {formError && (
                <div className="md:col-span-2">
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                    {formError}
                  </p>
                </div>
              )}

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={editingId ? updateMutation.isPending : createMutation.isPending}>
                  {editingId
                    ? (updateMutation.isPending ? "Actualizando..." : "Actualizar")
                    : (createMutation.isPending ? "Guardando..." : "Guardar")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setFormError(""); setEditingId(null); setForm(defaultForm) }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
        >
          Todas
        </Button>
        <Button
          variant={filterType === "EXPENSE" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("EXPENSE")}
        >
          Gastos
        </Button>
        <Button
          variant={filterType === "INCOME" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("INCOME")}
        >
          Ingresos
        </Button>
      </div>

      {fetchError && (
        <Card>
          <CardContent className="py-4 text-center text-red-500 text-sm">
            Error al cargar categorias. Verifica que el servidor este corriendo.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCategoryCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(categories || []).map((cat: Category) => (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {cat.type === "INCOME" ? "Ingreso" : cat.type === "EXPENSE" ? "Gasto" : "Ambos"}
                      </Badge>
                      {cat.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!cat.isDefault && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(cat)}
                      className="text-muted-foreground hover:text-blue-500 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(cat.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!categories || categories.length === 0) && !isLoading && (
            <div className="col-span-full text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <Tag className="h-8 w-8" />
              <p>Sin categorias</p>
            </div>
          )}
        </div>
      )}

      <ConfirmAction
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Eliminar categoria"
        description="¿Estás seguro de que quieres eliminar esta categoria? Esta acción no se puede deshacer."
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId) }}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  )
}