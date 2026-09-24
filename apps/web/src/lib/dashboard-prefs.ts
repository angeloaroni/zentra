"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export const DASHBOARD_WIDGETS = [
  { id: "upcoming", label: "Proximos pagos" },
  { id: "cashflow", label: "Flujo de caja" },
  { id: "categoryChart", label: "Gastos por categoria" },
  { id: "topCategories", label: "Donde va tu dinero" },
  { id: "goals", label: "Metas de ahorro" },
  { id: "health", label: "Salud financiera" },
  { id: "splits", label: "Division de gastos" },
  { id: "insights", label: "Insights" },
  { id: "netWorth", label: "Patrimonio neto" },
  { id: "recent", label: "Ultimos registros" },
] as const

interface DashboardPrefsState {
  hidden: string[]
  toggle: (id: string) => void
  reset: () => void
}

export const useDashboardPrefs = create<DashboardPrefsState>()(
  persist(
    (set) => ({
      hidden: [],
      toggle: (id) =>
        set((state) => ({
          hidden: state.hidden.includes(id)
            ? state.hidden.filter((x) => x !== id)
            : [...state.hidden, id],
        })),
      reset: () => set({ hidden: [] }),
    }),
    { name: "zentra-dashboard-prefs" }
  )
)
