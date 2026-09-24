"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { getUser, api } from "@/lib/api"
import { useSettings } from "@/lib/settings"
import { TopNav } from "@/components/layout/top-nav"
import { BottomNav } from "@/components/layout/bottom-nav"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { QuickAddTransaction } from "@/components/quick-add-transaction"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { setCurrency } = useSettings()

  const { data: profile } = useQuery<{ currency?: string }>({
    queryKey: ["profile"],
    queryFn: () => api("/users/profile"),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (profile?.currency) setCurrency(profile.currency)
  }, [profile?.currency, setCurrency])

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <TopNav />
      <main id="main-content" className="max-w-[1400px] mx-auto p-4 sm:p-6 pb-20 sm:pb-0">
        <EmailVerificationBanner />
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <QuickAddTransaction />
      <BottomNav />
    </div>
  )
}