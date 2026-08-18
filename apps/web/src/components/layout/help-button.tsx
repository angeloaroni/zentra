"use client"

import { HelpCircle } from "lucide-react"
import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { HELP_CONTENT, HelpSection } from "@/lib/help-content"

export function HelpButton({ section }: { section: HelpSection }) {
  const [open, setOpen] = useState(false)
  const content = HELP_CONTENT[section]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
        aria-label="Abrir ayuda de esta sección"
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={content.title} maxWidth="sm:max-w-lg">
        <div className="p-4 sm:p-6 space-y-5">
          <p className="text-sm text-muted-foreground">{content.intro}</p>
          <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700 dark:text-gray-300">
            {content.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {content.tip && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-300">
              <strong>Consejo:</strong> {content.tip}
            </div>
          )}
          <button type="button" onClick={() => setOpen(false)} className="w-full min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Entendido
          </button>
        </div>
      </Modal>
    </>
  )
}
