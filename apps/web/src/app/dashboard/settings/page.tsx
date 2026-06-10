"use client"

import { useState, useEffect } from "react"
import { useSettings, CURRENCIES, useHasHydrated, useMounted } from "@/lib/settings"
import { useFamilyStore, useFamilyHydrated } from "@/lib/family"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getUser } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, User, CreditCard } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const { currency, setCurrency } = useSettings()
  const hydrated = useHasHydrated()
  const familyHydrated = useFamilyHydrated()
  const mounted = useMounted()
  const { activeFamilyId, activeFamilyName } = useFamilyStore()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  if (!mounted || !hydrated || !familyHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold">Configuracion</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><span className="text-muted-foreground">Nombre:</span> {user?.name || "-"}</p>
          <p className="text-sm"><span className="text-muted-foreground">Email:</span> {user?.email || "-"}</p>
          <p className="text-sm"><span className="text-muted-foreground">Rol:</span> {user?.role || "-"}</p>
          <Link
            href="/dashboard/settings/profile"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
          >
            <User className="h-4 w-4" />
            Editar perfil
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Moneda global</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Esta moneda se usara en todas las transacciones, presupuestos y metas.
          </p>
          <div className="max-w-xs">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Familia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {activeFamilyId
              ? `Activa: ${activeFamilyName || "Familia"}`
              : "Vista actual: Mi cuenta (personal)"}
          </p>
          <Link
            href="/dashboard/settings/family"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Users className="h-4 w-4" />
            Gestionar familia
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Plan y facturacion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Administra tu plan de suscripcion y metodo de pago.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <CreditCard className="h-4 w-4" />
            Gestionar plan
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
