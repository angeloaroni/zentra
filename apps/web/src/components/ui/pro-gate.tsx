import Link from "next/link"
import { Check, Crown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProBadge } from "./pro-badge"

interface ProGateProps {
  title: string
  description: string
  features?: string[]
  ctaLabel?: string
  href?: string
  variant?: "card" | "page"
  className?: string
}

export function ProGate({
  title,
  description,
  features,
  ctaLabel = "Desbloquear Pro",
  href = "/dashboard/settings/billing",
  variant = "card",
  className,
}: ProGateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-gray-900 dark:to-indigo-950/30",
        variant === "page" ? "px-6 py-12" : "p-6",
        className
      )}
    >
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
          <Crown className="h-6 w-6 text-amber-300" aria-hidden="true" />
        </div>
        <ProBadge className="mb-2" size="md" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>

        {features && features.length > 0 && (
          <ul className="mx-auto mt-4 grid max-w-xs gap-1.5 text-left">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        <Link
          href={href}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
