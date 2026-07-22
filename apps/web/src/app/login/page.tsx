"use client"

import { useState, useEffect, Suspense } from "react"
import { setToken } from "@/lib/api"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

interface InvitationData {
  id: string
  email: string
  group: { id: string; name: string }
  inviter: { id: string; name: string }
}

function LoginForm() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")

  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [inviteError, setInviteError] = useState("")

  useEffect(() => {
    if (inviteToken) {
      fetch(`${API_URL}/splits/invitations/${inviteToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            setInvitation(data)
            setIsLogin(false)
          } else {
            setInviteError(data.message || "Invitacion no valida")
          }
        })
        .catch(() => setInviteError("No se pudo cargar la invitacion"))
    }
  }, [inviteToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register"
      const body = isLogin
        ? { email, password }
        : { name, email, password }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Error al procesar la solicitud")
        return
      }

      setToken(data.token)
      localStorage.setItem("zentra-user:v1", JSON.stringify(data.user))

      if (inviteToken && !isLogin) {
        try {
          const inviteRes = await fetch(`${API_URL}/splits/invitations/${inviteToken}/accept`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.token}`,
            },
          })
          const inviteData = await inviteRes.json()
          if (inviteData.groupId) {
            window.location.href = `/dashboard/splits/${inviteData.groupId}`
            return
          }
        } catch {}
      }

      window.location.href = isLogin ? "/dashboard" : "/dashboard/onboarding"
    } catch {
      setError("No se pudo conectar al servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {invitation && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {invitation.inviter.name} te ha invitado al grupo
          </p>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
            {invitation.group.name}
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            Registrate para unirte automaticamente
          </p>
        </div>
      )}
      {inviteError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Cargando..." : isLogin ? "Iniciar Sesion" : "Registrarse"}
        </Button>
      </form>

      {isLogin && (
        <div className="mt-2 text-center">
          <a
            href="/forgot-password"
            className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            Olvidaste tu contrasena?
          </a>
        </div>
      )}

      <div className="mt-4 text-center text-sm">
        {isLogin ? "No tienes cuenta?" : "Ya tienes cuenta?"}{" "}
        <button
          onClick={() => { setIsLogin(!isLogin); setError("") }}
          className="text-indigo-600 hover:underline font-medium"
        >
          {isLogin ? "Registrate" : "Inicia sesion"}
        </button>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-2">
            <span className="text-white font-bold text-lg">Z</span>
          </Link>
          <CardTitle className="text-2xl font-semibold">
            Zentra
          </CardTitle>
          <CardDescription>
            Inicia sesion para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-center text-gray-400 py-4">Cargando...</div>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}