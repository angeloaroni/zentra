"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUser } from "@/lib/api"
import { TopNav } from "@/components/layout/top-nav"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push("/")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <TopNav />
      <main className="max-w-[1400px] mx-auto p-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}