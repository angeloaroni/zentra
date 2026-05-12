"use client"

import { ReactNode } from "react"

interface FormCardProps {
  show: boolean
  children: ReactNode
}

export function FormCard({ show, children }: FormCardProps) {
  if (!show) return null
  return <>{children}</>
}