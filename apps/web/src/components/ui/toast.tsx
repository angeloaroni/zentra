"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning"
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

let toastCount = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++toastCount}`
    const duration = toast.duration ?? 4000
    setToasts((prev) => [...prev, { ...toast, id }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider")
  return context
}

const variantStyles = {
  default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
  success: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
  error: "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800",
  warning: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
}

const variantIcons = {
  default: null,
  success: "✓",
  error: "✕",
  warning: "!",
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[]
  removeToast: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-in slide-in-from-bottom-5 fade-in duration-200",
            variantStyles[toast.variant || "default"]
          )}
        >
          {toast.variant && toast.variant !== "default" && (
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                toast.variant === "success" &&
                  "bg-emerald-500 text-white",
                toast.variant === "error" &&
                  "bg-red-500 text-white",
                toast.variant === "warning" &&
                  "bg-amber-500 text-white"
              )}
            >
              {variantIcons[toast.variant]}
            </span>
          )}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {toast.title}
              </p>
            )}
            {toast.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}