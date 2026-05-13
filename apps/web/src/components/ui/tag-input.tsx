"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useFamilyStore } from "@/lib/family"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { X, Plus, ChevronDown } from "lucide-react"

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

export interface Tag {
  id: string
  name: string
  color: string
  icon: string
  budget: number | null
}

interface TagInputProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  allTags?: Tag[]
  excludeTagIds?: string[]
  onCreateTag?: (tag: Tag) => void
}

export function TagInput({ selectedTagIds, onTagsChange, allTags = [], excludeTagIds = [], onCreateTag }: TagInputProps) {
  const queryClient = useQueryClient()
  const { activeFamilyId } = useFamilyStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [form, setForm] = useState({
    name: "",
    color: TAG_COLORS[0],
    icon: TAG_ICONS[0],
    budget: "",
  })
  const [formError, setFormError] = useState("")

  const createMutation = useMutation({
    mutationFn: (data: any) => api<Tag>("/tags", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      if (onCreateTag) {
        onCreateTag(newTag)
      } else {
        onTagsChange([...selectedTagIds, newTag.id])
      }
      setTimeout(() => {
        setShowCreate(false)
        setForm({ name: "", color: TAG_COLORS[0], icon: TAG_ICONS[0], budget: "" })
        setFormError("")
      }, 0)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const availableTags = allTags.filter(
    (t) => !selectedTagIds.includes(t.id) && !excludeTagIds.includes(t.id)
  )

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

  function removeTag(tagId: string) {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId))
  }

  function addTag(tagId: string) {
    onTagsChange([...selectedTagIds, tagId])
    setShowDropdown(false)
  }

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id))

  function renderIcon(iconName: string, className = "h-4 w-4") {
    const icons: Record<string, string> = {
      cake: "🎂", gift: "🎁", heart: "❤️", star: "⭐", home: "🏠",
      car: "🚗", plane: "✈️", "shopping-bag": "🛍️", utensils: "🍴",
      coffee: "☕", beer: "🍺", film: "🎬", music: "🎵", book: "📖",
      briefcase: "💼", "graduation-cap": "🎓", baby: "👶", "tree-pine": "🎄",
      "party-popper": "🎉", "heart-handshake": "💑",
    }
    return <span className={className}>{icons[iconName] || "🏷️"}</span>
  }

  return (
    <div className="space-y-2">
      <Label>Eventos</Label>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {renderIcon(tag.icon)}
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="ml-1 hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown or Create form */}
      {showCreate ? (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre del evento</Label>
                <Input
                  placeholder="Ej: Cumpleaños de Sofía"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        form.color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Icono</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      className={`h-8 w-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                        form.icon === iconName
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-secondary"
                      }`}
                      onClick={() => setForm({ ...form, icon: iconName })}
                    >
                      {renderIcon(iconName, "h-4 w-4")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Presupuesto mensual (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Sin límite"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creando..." : "Crear evento"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreate(false)
                    setFormError("")
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background text-sm"
            >
              <span className="text-muted-foreground">
                {availableTags.length > 0 ? `${availableTags.length} eventos disponibles` : "Sin eventos disponibles"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {showDropdown && availableTags.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} aria-hidden="true" />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      <span
                        className="h-6 w-6 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {renderIcon(tag.icon, "h-3 w-3")}
                      </span>
                      {tag.name}
                      {tag.budget && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          ${tag.budget}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Crear
          </Button>
        </div>
      )}
    </div>
  )
}
