"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      window.location.href = "/dashboard"
    } catch {
      setError("No se pudo conectar al servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-2">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <CardTitle className="text-2xl font-bold">
            Zentra
          </CardTitle>
          <CardDescription>
            {isLogin ? "Inicia sesion para continuar" : "Crea tu cuenta gratuita"}
          </CardDescription>
          {!isLogin && (
            <p className="text-xs text-gray-400 mt-1">
              Plan gratis disponible — <a href="/pricing" className="text-blue-500 hover:underline">ver planes</a>
            </p>
          )}
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </main>
  )
}
