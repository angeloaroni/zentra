"use client"

import * as React from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD - Dolar" },
  { code: "EUR", symbol: "\u20AC", label: "EUR - Euro" },
  { code: "GBP", symbol: "\u00A3", label: "GBP - Libra" },
  { code: "MXN", symbol: "MX$", label: "MXN - Peso Mexicano" },
  { code: "COP", symbol: "COL$", label: "COP - Peso Colombiano" },
  { code: "ARS", symbol: "AR$", label: "ARS - Peso Argentino" },
  { code: "CLP", symbol: "CL$", label: "CLP - Peso Chileno" },
  { code: "PEN", symbol: "S/", label: "PEN - Sol" },
  { code: "BRL", symbol: "R$", label: "BRL - Real" },
  { code: "VES", symbol: "Bs", label: "VES - Bolivar" },
]

export function getCurrencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol || "$"
}

export function formatMoney(n: number, currency: string) {
  const sym = getCurrencySymbol(currency)
  const formatted = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${formatted} ${sym}`
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

export function formatDateShort(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  const day = String(date.getDate()).padStart(2, "0")
  const month = MONTHS_ES[date.getMonth()].substring(0, 3)
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export function formatMonthYear(date: Date) {
  return `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`
}

export function formatMonthShort(date: Date | number) {
  const d = typeof date === "number" ? new Date(2024, date) : date
  return MONTHS_ES[d.getMonth()].substring(0, 3)
}

interface SettingsState {
  currency: string
  setCurrency: (currency: string) => void
  _hasHydrated: boolean
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      currency: "EUR",
      setCurrency: (currency) => set({ currency }),
      _hasHydrated: false,
    }),
    { 
      name: "zentra-settings",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true
        }
      },
    }
  )
)

export function useHasHydrated() {
  return useSettings((state) => state._hasHydrated)
}

export function useMounted() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
