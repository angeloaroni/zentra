"use client"

import { useEffect, useState } from "react"
import { api, getUser, setUser } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { MailWarning, Loader2, X } from "lucide-react"

const DISMISS_KEY = "zentra-verify-banner-dismissed:v1"

export function EmailVerificationBanner() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return

    const user = getUser()
    if (!user || user.emailVerified !== false) return

    setVisible(true)
    setEmail(user.email)

    api<{ emailVerified: boolean }>("/auth/me")
      .then((fresh) => {
        if (fresh?.emailVerified) {
          setUser({ ...user, ...fresh })
          setVisible(false)
        }
      })
      .catch(() => {})
  }, [])

  if (!visible) return null

  async function resend() {
    setSending(true)
    try {
      await api("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      addToast({
        title: "Email reenviado",
        description: "Revisa tu bandeja de entrada para verificar tu cuenta.",
        variant: "success",
      })
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err.message || "No se pudo reenviar el email",
        variant: "error",
      })
    } finally {
      setSending(false)
    }
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setVisible(false)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 sm:mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <MailWarning className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Verifica tu email
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Te enviamos un enlace a {email}. Verifica tu cuenta para mayor seguridad.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={resend} disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
              Enviando...
            </>
          ) : (
            "Reenviar email"
          )}
        </Button>
        <button
          onClick={dismiss}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          aria-label="Cerrar aviso de verificacion"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
