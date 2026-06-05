"use client"

import { useRef } from "react"
import { useInView, useReducedMotion, motion } from "framer-motion"

export function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const prefersReducedMotion = useReducedMotion()
  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : (prefersReducedMotion ? {} : { opacity: 0, y: 30 })}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay, ease: [0.25, 0.4, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
