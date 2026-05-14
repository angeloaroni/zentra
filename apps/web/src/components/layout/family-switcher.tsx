"use client"

import { useFamilyStore, useFamilyHydrated } from "@/lib/family"
import { useQuery } from "@tanstack/react-query"
import { api, getUser } from "@/lib/api"
import { useState, useEffect } from "react"
import { ChevronDown, Users, User, Check } from "lucide-react"

interface Family {
  id: string
  name: string
}

export function FamilySwitcher() {
  const { activeFamilyId, activeFamilyName, setActiveFamily } = useFamilyStore()
  const familyHydrated = useFamilyHydrated()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    setUser(getUser())
  }, [])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("keydown", handleEsc)
      return () => document.removeEventListener("keydown", handleEsc)
    }
  }, [open])

  const { data: families, isError } = useQuery<Family[]>({
    queryKey: ["families"],
    queryFn: () => api("/families"),
    enabled: !!user,
    retry: false,
  })

  if (!mounted || !familyHydrated) {
    return null
  }

  const familyList = isError ? [] : (families || [])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {activeFamilyId ? (
          <>
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700 dark:text-gray-300 hidden md:inline">
              {activeFamilyName || "Familia"}
            </span>
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-gray-500 dark:text-gray-400 hidden md:inline">
              Mi cuenta
            </span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            {/* Personal account option */}
            <button
              onClick={() => {
                setActiveFamily(null)
                setOpen(false)
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-700 dark:text-gray-300">Mi cuenta</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              {!activeFamilyId && <Check className="h-4 w-4 text-blue-600" />}
            </button>

{familyList.length > 0 && (
               <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                 <p className="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase">
                   Familias
                 </p>
                 {familyList.map((family) => (
                  <button
                    key={family.id}
                    onClick={() => {
                      setActiveFamily(family.id, family.name)
                      setOpen(false)
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {family.name}
                    </span>
                    {activeFamilyId === family.id && (
                      <Check className="h-4 w-4 text-blue-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
