import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProBadge({
  className,
  size = "sm",
}: {
  className?: string
  size?: "sm" | "md"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-inset ring-white/20",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <Crown
        className={cn("text-amber-300", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")}
        aria-hidden="true"
      />
      Pro
    </span>
  )
}
