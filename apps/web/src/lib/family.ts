"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface FamilyState {
  activeFamilyId: string | null
  activeFamilyName: string | null
  setActiveFamily: (id: string | null, name?: string | null) => void
  clearFamily: () => void
  _hasHydrated: boolean
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      activeFamilyId: null,
      activeFamilyName: null,
      setActiveFamily: (id, name = null) =>
        set({ activeFamilyId: id, activeFamilyName: name }),
      clearFamily: () =>
        set({ activeFamilyId: null, activeFamilyName: null }),
      _hasHydrated: false,
    }),
    {
      name: "zentra-family",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true
        }
      },
    }
  )
)

export function useFamilyHydrated() {
  return useFamilyStore((state) => state._hasHydrated)
}
