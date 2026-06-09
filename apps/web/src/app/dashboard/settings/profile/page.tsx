"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getUser, clearToken } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Trash2, Lock, User } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    setName(u?.name || "")
  }, [])

  const updateName = useMutation({
    mutationFn: (data: { name: string }) =>
      api("/users/profile", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (updated: any) => {
      localStorage.setItem("zentra-user:v1", JSON.stringify(updated))
      setUser(updated)
      setSuccess("Nombre actualizado")
      setError("")
      setTimeout(() => setSuccess(""), 3000)
    },
    onError: (err: Error) => {
      setError(err.message)
      setSuccess("")
    },
  })

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api("/users/change-password", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      setSuccess("Contraseña actualizada")
      setError("")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setSuccess(""), 3000)
    },
    onError: (err: Error) => {
      setError(err.message)
      setSuccess("")
    },
  })

  const deleteAccount = useMutation({
    mutationFn: (data: { password: string }) =>
      api("/users/account", { method: "DELETE", body: JSON.stringify(data) }),
    onSuccess: () => {
      clearToken()
      window.location.href = "/login"
    },
    onError: (err: Error) => {
      setError(err.message)
      setSuccess("")
    },
  })

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!name.trim()) {
      setError("El nombre es requerido")
      return
    }
    updateName.mutate({ name: name.trim() })
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!currentPassword) {
      setError("Ingresa tu contraseña actual")
      return
    }
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    changePassword.mutate({ currentPassword, newPassword })
  }

  function handleDeleteAccount() {
    setError("")
    if (!deletePassword) {
      setError("Ingresa tu contraseña para eliminar la cuenta")
      return
    }
    deleteAccount.mutate({ password: deletePassword })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Mi perfil</h1>
      </div>

      {success && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Edit Name */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Nombre</h2>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <form onSubmit={handleNameSubmit} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="flex-1"
            />
            <Button type="submit" disabled={updateName.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateName.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Cambiar contraseña</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">Contraseña actual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Confirmar contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={changePassword.isPending}>
              <Lock className="h-4 w-4 mr-1" />
              {changePassword.isPending ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-0 shadow-sm border-red-200 dark:border-red-900">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-red-600 dark:text-red-400">Eliminar cuenta</h2>
              <p className="text-xs text-gray-500">Esta accion es irreversible</p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar mi cuenta
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Para confirmar, ingresa tu contraseña:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="flex-1 min-w-0"
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleteAccount.isPending || !deletePassword}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleteAccount.isPending ? "Eliminando..." : "Confirmar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeletePassword("")
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
