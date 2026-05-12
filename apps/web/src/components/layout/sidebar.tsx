"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  PiggyBank,
  Target,
  Wallet,
  Settings,
  LogOut,
} from "lucide-react"
import { clearToken } from "@/lib/api"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/dashboard/accounts", label: "Cuentas", icon: Wallet },
  { href: "/dashboard/categories", label: "Categorias", icon: Tag },
  { href: "/dashboard/budgets", label: "Presupuestos", icon: PiggyBank },
  { href: "/dashboard/goals", label: "Metas", icon: Target },
  { href: "/dashboard/settings", label: "Configuracion", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  function logout() {
    clearToken()
    window.location.href = "/"
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700 text-white">
      <div className="flex h-16 items-center px-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
            Z
          </div>
          <span className="text-xl font-bold tracking-tight">Zentra</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/20 text-white shadow-lg shadow-purple-500/20"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
