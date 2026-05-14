"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getUser } from "@/lib/api"
import { useFamilyStore, useFamilyHydrated } from "@/lib/family"
import { useMounted } from "@/lib/settings"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, UserPlus, Trash2, ArrowLeft, Copy, Check } from "lucide-react"
import Link from "next/link"

interface Family {
  id: string
  name: string
  createdById: string
  members: { id: string; userId: string; role: string; user: { id: string; name: string; email: string } }[]
}

export default function FamilyPage() {
  const queryClient = useQueryClient()
  const familyHydrated = useFamilyHydrated()
  const mounted = useMounted()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const { activeFamilyId, setActiveFamily, clearFamily } = useFamilyStore()
  const [familyName, setFamilyName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [joinFamilyId, setJoinFamilyId] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const { data: families } = useQuery<Family[]>({
    queryKey: ["families"],
    queryFn: () => api("/families"),
  })

  const currentFamily = families?.find(f => f.id === activeFamilyId)

  const createFamily = useMutation({
    mutationFn: (name: string): Promise<Family> =>
      api("/families", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (family: Family) => {
      queryClient.invalidateQueries({ queryKey: ["families"] })
      setActiveFamily(family.id, family.name)
      setFamilyName("")
    },
    onError: (err: Error) => setError(err.message),
  })

  const inviteMember = useMutation({
    mutationFn: ({ familyId, email }: { familyId: string; email: string }) =>
      api(`/families/${familyId}/invite`, { method: "POST", body: JSON.stringify({ email }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["families"] })
      setInviteEmail("")
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeMember = useMutation({
    mutationFn: ({ familyId, userId }: { familyId: string; userId: string }) =>
      api(`/families/${familyId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["families"] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const joinFamilyMut = useMutation({
    mutationFn: (familyId: string) =>
      api("/users/join-family", { method: "POST", body: JSON.stringify({ familyId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["families"] })
      setJoinFamilyId("")
    },
    onError: (err: Error) => setError(err.message),
  })

  const leaveFamilyMut = useMutation({
    mutationFn: () => api("/users/leave-family", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["families"] })
      clearFamily()
    },
    onError: (err: Error) => setError(err.message),
  })

  if (!mounted || !familyHydrated) {
    return <div className="space-y-6"><p className="text-center text-muted-foreground py-8">Cargando...</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gestionar familia</h1>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-start gap-3">
          <span className="shrink-0 mt-0.5">!</span>
          <div className="flex-1">
            <p>{error}</p>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 shrink-0">
            x
          </button>
        </div>
      )}

      {/* Current family or create/join */}
      {currentFamily ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{currentFamily.name}</h2>
                <p className="text-xs text-gray-500">{currentFamily.members.length} miembros</p>
              </div>
            </div>

            {/* Members list */}
            <div className="space-y-2 mb-4">
              {currentFamily.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {member.user.name}
                        {member.userId === user?.id && " (tu)"}
                      </p>
                      <p className="text-xs text-gray-400">{member.user.email}</p>
                    </div>
                  </div>
                  {member.userId !== currentFamily.createdById && member.userId !== user?.id && (
                    <button
                      onClick={() => removeMember.mutate({ familyId: currentFamily.id, userId: member.userId })}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Share Family ID */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <Label className="text-xs">Compartir ID de familia</Label>
              <p className="text-xs text-gray-400 mb-2">
                Comparte este ID con quien quieras unir a tu familia. Ellos deben ir a Configuracion → Gestionar familia → Unirse.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={currentFamily.id}
                  className="font-mono text-xs min-w-0"
                />
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(currentFamily.id)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Invite member by email (only if registered) */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
              <Label className="text-xs">Invitar por email (solo usuarios registrados)</Label>
              <p className="text-xs text-gray-400 mb-2">
                Si la persona ya tiene cuenta en Zentra, puedes invitarla directamente.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 min-w-0"
                />
                <Button
                  className="shrink-0"
                  onClick={() => {
                    if (inviteEmail.trim()) {
                      inviteMember.mutate({ familyId: currentFamily.id, email: inviteEmail.trim() })
                    }
                  }}
                  disabled={!inviteEmail.trim() || inviteMember.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Invitar
                </Button>
              </div>
            </div>

            {/* Leave family */}
            {user?.id !== currentFamily.createdById && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm("¿Seguro que quieres salir de la familia?")) {
                      leaveFamilyMut.mutate()
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Salir de la familia
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create family */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Crear familia</h2>
              <Label className="text-xs">Nombre de la familia</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="Mi familia"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (familyName.trim()) {
                      createFamily.mutate(familyName.trim())
                    }
                  }}
                  disabled={!familyName.trim() || createFamily.isPending}
                >
                  Crear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Join family */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Unirse a familia</h2>
              <Label className="text-xs">ID de la familia</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="ID de la familia"
                  value={joinFamilyId}
                  onChange={(e) => setJoinFamilyId(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (joinFamilyId.trim()) {
                      joinFamilyMut.mutate(joinFamilyId.trim())
                    }
                  }}
                  disabled={!joinFamilyId.trim() || joinFamilyMut.isPending}
                >
                  Unirse
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Pide el ID de la familia a quien la creó
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
