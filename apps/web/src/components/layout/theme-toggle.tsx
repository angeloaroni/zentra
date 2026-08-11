"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Cambiar tema">
        <Sun className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600" aria-hidden="true" />
      )}
    </button>
  )
}
