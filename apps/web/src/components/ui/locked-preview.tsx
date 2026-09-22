import Link from "next/link"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProBadge } from "./pro-badge"

interface LockedPreviewProps {
  title: string
  description: string
  ctaLabel?: string
  href?: string
  children: React.ReactNode
  className?: string
}

export function LockedPreview({
  title,
  description,
  ctaLabel = "Desbloquear Pro",
  href = "/dashboard/settings/billing",
  children,
  className,
}: LockedPreviewProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <div className="pointer-events-none select-none opacity-60 blur-[6px]" aria-hidden="true">
        {children}
      </div>

      <div
        role="region"
        aria-label={`${title} - funcion Pro`}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/70 via-white/85 to-white p-4 text-center dark:from-gray-900/70 dark:via-gray-900/85 dark:to-gray-900"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <ProBadge />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="max-w-xs text-xs text-gray-600 dark:text-gray-300">{description}</p>
        <Link
          href={href}
          className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
