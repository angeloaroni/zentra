"use client"

import { useState, Suspense } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { addToast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      addToast({ title: "Error", description: "Token invalido", variant: "error" })
      return
    }
    setLoading(true)
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })
      setSuccess(true)
      addToast({
        title: "Contrasena actualizada",
        description: "Ahora puedes iniciar sesion con tu nueva contrasena.",
        variant: "success",
      })
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "error" })
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">Enlace invalido. Solicita uno nuevo.</p>
        <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium">
          Solicitar enlace de recuperacion
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Contrasena actualizada
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Tu contrasena ha sido cambiada exitosamente.
        </p>
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Ir al inicio de sesion
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nueva contrasena
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          placeholder="Minimo 6 caracteres"
          required
          minLength={6}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Cambiar contrasena"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold">Z</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Zentra</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
            Nueva contrasena
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
            Ingresa tu nueva contrasena.
          </p>

          <Suspense fallback={<div className="text-center text-gray-400">Cargando...</div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Volver al inicio de sesion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}