"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { addToast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      setSent(true)
      addToast({
        title: "Email enviado",
        description: "Revisa tu bandeja de entrada para el enlace de recuperacion.",
        variant: "success",
      })
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "error" })
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold">Z</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Zentra</span>
          </div>

          {!sent ? (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
                Recuperar contrasena
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Revisa tu email
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Si existe una cuenta con <strong>{email}</strong>, recibiras un enlace para restablecer tu contrasena.
              </p>
              <button
                onClick={() => { setSent(false); setEmail("") }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                No recibiste el email? Intenta de nuevo
              </button>
            </div>
          )}

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
    </main>
  )
}