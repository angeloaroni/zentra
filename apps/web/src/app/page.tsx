"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, useInView, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Menu,
  X,
  Wallet,
  TrendingUp,
  Users,
  PieChart,
  Target,
  BarChart3,
  Shield,
  Globe,
  Zap,
  Receipt,
  Coins,
} from "lucide-react"

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [
    { href: "#features", label: "Funciones" },
    { href: "#pricing", label: "Precios" },
    { href: "#faq", label: "FAQ" },
  ]
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span className="text-white font-semibold text-lg">Zentra</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Iniciar sesion
          </Link>
          <Link href="/login" className="text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all">
            Crear cuenta gratis
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-white">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0B1120] border-t border-white/5 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">
                  {l.label}
                </a>
              ))}
              <Link href="/login" className="text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-lg">
                Crear cuenta gratis
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center bg-[#0B1120] pt-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-600/5 to-indigo-600/5 rounded-full blur-3xl" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.3, 1] }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5">
            <Zap size={14} />
            Gestiona tu dinero y divide gastos con amigos
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.4, 0.3, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight tracking-tight max-w-3xl"
        >
          Tus finanzas,{" "}
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            claras de una vez
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0.3, 1] }}
          className="mt-6 text-lg text-gray-400 max-w-2xl leading-relaxed"
        >
          Gestiona tu dinero y divide gastos con amigos. Todo en un solo lugar,
          sin hojas de calculo ni apps separadas.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.3, 1] }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/login"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            Crear cuenta gratis
            <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className="text-gray-400 hover:text-white px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all text-base"
          >
            Ver como funciona
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.4, 0.3, 1] }}
          className="mt-16 w-full max-w-4xl"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/5">
            <div className="bg-[#111827] p-1">
              <div className="flex items-center gap-1.5 px-4 py-3">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-gray-500">zentra.app — Dashboard</span>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5">
                    <p className="text-blue-200 text-xs font-medium">Balance total</p>
                    <p className="text-white text-2xl font-bold mt-1">12.450,00 €</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-medium">+12.5% vs mes anterior</span>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-xs font-medium">Ingresos</p>
                    <p className="text-emerald-400 text-2xl font-bold mt-1">5.200,00 €</p>
                    <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-xs font-medium">Gastos</p>
                    <p className="text-rose-400 text-2xl font-bold mt-1">3.150,00 €</p>
                    <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: "42%" }} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-gray-800/50 rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-300 text-sm font-medium">Gastos por categoria</p>
                    <span className="text-xs text-gray-500">Este mes</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { name: "Alimentacion", pct: 35, color: "bg-emerald-500" },
                      { name: "Transporte", pct: 25, color: "bg-blue-500" },
                      { name: "Vivienda", pct: 20, color: "bg-purple-500" },
                      { name: "Ocio", pct: 12, color: "bg-amber-500" },
                      { name: "Otros", pct: 8, color: "bg-gray-500" },
                    ].map((c) => (
                      <div key={c.name} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
                        <span className="text-xs text-gray-400">{c.name} {c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function ProblemsSection() {
  const problems = [
    {
      icon: <Eye size={28} />,
      title: "Donde se fue tu dinero?",
      text: "Entre suscripciones, salidas y gastos pequenos, pierdes la vista de todo. Zentra los organiza automaticamente para que sepas exactamente donde esta cada centavo.",
      accent: "from-rose-500/10 to-orange-500/10",
      iconBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    {
      icon: <BarChart3 size={28} />,
      title: "Excel ya no es suficiente",
      text: "Hojas de calculo que nadie actualiza. Formulas que se rompen. Es hora de algo que funcione por su cuenta, sin esfuerzo manual.",
      accent: "from-blue-500/10 to-cyan-500/10",
      iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      icon: <Users size={28} />,
      title: "Dividir gastos no tiene por que ser complicado",
      text: "Apps separadas, chats perdidos, calculadoras mentales. Zentra integra la division de gastos con tu vida financiera.",
      accent: "from-purple-500/10 to-pink-500/10",
      iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
  ]

  return (
    <section className="py-24 bg-[#F8FAFC] dark:bg-gray-50" id="problems">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 rounded-full px-4 py-1.5">
              El problema
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Tu dinero merece mas que una hoja de calculo
            </h2>
          </div>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.15}>
              <div className="group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-500">
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl ${p.iconBg} border flex items-center justify-center mb-5`}>
                    {p.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{p.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{p.text}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: <PieChart size={24} />,
      badge: "Panel principal",
      title: "Todo lo que necesitas, en un vistazo",
      text: "Ingresos, gastos, balance, ahorro. Sin navegar entre pantallas. Tu resumen financiero siempre visible, siempre actualizado.",
      mockup: (
        <div className="bg-[#111827] rounded-xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Resumen mensual</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Jun 2025</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-4">
              <p className="text-blue-200 text-xs">Balance</p>
              <p className="text-white text-lg font-bold">8.450 €</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-xs">Ahorro</p>
              <p className="text-emerald-400 text-lg font-bold">38%</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-xs">Ingresos</p>
              <p className="text-emerald-400 text-lg font-bold">5.200 €</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-xs">Gastos</p>
              <p className="text-rose-400 text-lg font-bold">3.150 €</p>
            </div>
          </div>
        </div>
      ),
      dark: true,
    },
    {
      icon: <Target size={24} />,
      badge: "Presupuestos",
      title: "Sabes cuanto puedes gastar",
      text: "Te avisamos cuando estas cerca del limite. Sin sorpresas a fin de mes. Crea presupuestos por categoria y sigue tu progreso en tiempo real.",
      mockup: (
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-900 text-sm mb-4">Presupuestos de junio</h4>
          {[
            { name: "Alimentacion", spent: 630, total: 800, color: "bg-emerald-500" },
            { name: "Transporte", spent: 180, total: 250, color: "bg-blue-500" },
            { name: "Ocio", spent: 290, total: 300, color: "bg-amber-500" },
          ].map((b) => (
            <div key={b.name} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">{b.name}</span>
                <span className="text-gray-400">{b.spent}€/{b.total}€</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${b.color} rounded-full transition-all`} style={{ width: `${(b.spent / b.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      ),
      dark: false,
    },
    {
      icon: <Wallet size={24} />,
      badge: "Metas",
      title: "Tus objetivos, tu ritmo",
      text: "Ahorra para un viaje, un coche, o lo que quieras. Ve tu progreso, aporta cuando puedas, y celebra cuando llegues. Sin presion.",
      mockup: (
        <div className="bg-[#111827] rounded-xl p-5 border border-white/10">
          <h4 className="text-white font-bold text-sm mb-4">Mis metas</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-sm">Viaje a Japon</span>
                <span className="text-emerald-400 text-xs font-medium">75%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: "75%" }} />
              </div>
              <p className="text-gray-500 text-xs mt-1">3.750 € de 5.000 €</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-sm">Fondo de emergencia</span>
                <span className="text-blue-400 text-xs font-medium">42%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: "42%" }} />
              </div>
              <p className="text-gray-500 text-xs mt-1">4.200 € de 10.000 €</p>
            </div>
          </div>
        </div>
      ),
      dark: true,
    },
    {
      icon: <Users size={24} />,
      badge: "Dividir gastos",
      title: "Divide gastos con amigos sin complicaciones",
      text: "Crea grupos, divide gastos igual o por porcentaje, simplifica deudas automaticamente. Todo integrado con tus finanzas personales.",
      mockup: (
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-900 text-sm">Viaje a Europa</h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">3 miembros</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">J</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cena</p>
                  <p className="text-xs text-gray-500">Juan pago</p>
                </div>
              </div>
              <span className="font-bold text-gray-900">120 €</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">M</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Taxi</p>
                  <p className="text-xs text-gray-500">Maria pago</p>
                </div>
              </div>
              <span className="font-bold text-gray-900">45 €</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-medium text-blue-800 mb-2">Balances simplificados</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-600 font-medium">Maria</span>
              <span className="text-gray-400">le debe</span>
              <span className="text-emerald-600 font-medium">27,50 €</span>
              <span className="text-gray-400">a</span>
              <span className="text-blue-600 font-medium">Juan</span>
            </div>
          </div>
        </div>
      ),
      dark: false,
    },
  ]

  return (
    <section className="py-24 bg-[#0B1120]" id="features">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-20">
            <span className="text-sm font-medium text-blue-400 bg-blue-500/10 rounded-full px-4 py-1.5 border border-blue-500/20">
              Funciones
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Diseñado para que lo uses, no para que lo mires
            </h2>
          </div>
        </FadeIn>
        <div className="space-y-32">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={0.1}>
              <div className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12`}>
                <div className="flex-1 space-y-5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-400">
                    {f.icon}
                    {f.badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-white leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    {f.text}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    {i === 0 && <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">Probar gratis <ArrowRight size={14} /></Link>}
                    {i === 1 && <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">Crear presupuesto <ArrowRight size={14} /></Link>}
                    {i === 2 && <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">Definir meta <ArrowRight size={14} /></Link>}
                    {i === 3 && <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">Dividir gastos <ArrowRight size={14} /></Link>}
                  </div>
                </div>
                <div className="flex-1 w-full max-w-md">
                  {f.mockup}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function SplitsSection() {
  return (
    <section className="py-24 bg-[#F8FAFC]" id="splits">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 rounded-full px-4 py-1.5">
              Dividir gastos
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Finanzas compartidas sin dramas
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
              Crea grupos con amigos, divide gastos de forma flexible, y simplifica deudas automaticamente. Todo integrado con tus finanzas.
            </p>
          </div>
        </FadeIn>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <FadeIn delay={0.1}>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Crea grupos con amigos</h3>
                  <p className="text-gray-500 text-sm">Invita por email, crea grupos para viajes, cenas, o gastos compartidos.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Divide en partes iguales o por porcentaje</h3>
                  <p className="text-gray-500 text-sm">Igual para todos, porcentaje, o monto exacto. Tu decides como dividir.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Coins size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Simplifica deudas automaticamente</h3>
                  <p className="text-gray-500 text-sm">El algoritmo minimiza transfers. Si A le debe a B y B a C, simplifica a un solo pago.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Wallet size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Registra pagos y salda deudas</h3>
                  <p className="text-gray-500 text-sm">Registra cuando alguien paga. Se crea automaticamente en tu registro de transacciones.</p>
                </div>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  V
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Viaje a Europa</p>
                  <p className="text-xs text-gray-500">3 miembros</p>
                </div>
              </div>
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">J</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cena en Roma</p>
                      <p className="text-xs text-gray-500">Juan pago</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">120 €</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-bold">M</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Taxi al aeropuerto</p>
                      <p className="text-xs text-gray-500">Maria pago</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">45 €</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-bold">A</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Hotel 2 noches</p>
                      <p className="text-xs text-gray-500">Ana pago</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">280 €</span>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 mb-3 uppercase tracking-wide">Balances simplificados</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">M</div>
                    <span className="text-gray-600">Maria le debe</span>
                    <span className="font-bold text-red-600">27,50 €</span>
                    <span className="text-gray-400">a</span>
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">J</div>
                    <span className="text-gray-600">Juan</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">A</div>
                    <span className="text-gray-600">Ana le debe</span>
                    <span className="font-bold text-red-600">37,50 €</span>
                    <span className="text-gray-400">a</span>
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">J</div>
                    <span className="text-gray-600">Juan</span>
                  </div>
                </div>
              </div>
              <Link href="/login" className="mt-5 block text-center py-2.5 rounded-lg bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors">
                Probar gratis
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

function ExtraFeaturesStrip() {
  const items = [
    { icon: <Users size={20} />, title: "Dividir gastos", text: "Grupos, splits, simplificar deudas" },
    { icon: <Globe size={20} />, title: "10 monedas", text: "USD, EUR, MXN, y mas" },
    { icon: <Shield size={20} />, title: "Seguro", text: "Conexion encriptada" },
    { icon: <Zap size={20} />, title: "Rapido", text: "Sin esperas" },
  ]
  return (
    <section className="py-16 bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                <p className="text-gray-500 text-xs">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const plans = [
    {
      name: "Gratis",
      price: "0 €",
      period: "por siempre",
      icon: <Zap size={20} />,
      gradient: "from-gray-600 to-gray-700",
      features: [
        "Hasta 50 transacciones/mes",
        "2 cuentas",
        "3 presupuestos",
        "3 metas de ahorro",
        "1 grupo de division (3 personas)",
        "10 gastos compartidos/mes",
        "Division igual solamente",
      ],
      cta: "Empezar gratis",
      popular: false,
    },
    {
      name: "Pro",
      price: "4,99 €",
      period: "/mes",
      icon: <TrendingUp size={20} />,
      gradient: "from-blue-500 to-indigo-600",
      features: [
        "Transacciones ilimitadas",
        "Cuentas ilimitadas",
        "Presupuestos ilimitados",
        "Metas ilimitadas",
        "Grupos de division ilimitados",
        "Division por % y monto exacto",
        "Gastos recurrentes compartidos",
        "Desglose de items por persona",
        "Conversion de monedas",
        "Guardar divisiones por defecto",
        "Exportar a CSV",
        "Alertas de presupuesto",
      ],
      cta: "Comenzar prueba gratis",
      popular: true,
    },
    {
      name: "Familia",
      price: "7,99 €",
      period: "/mes",
      icon: <Users size={20} />,
      gradient: "from-purple-500 to-pink-600",
      features: [
        "Todo lo de Pro",
        "Hasta 6 miembros",
        "Datos compartidos en familia",
        "Roles (Admin / Miembro)",
        "Invitar por email",
        "Vista personal y familiar",
      ],
      cta: "Comenzar prueba gratis",
      popular: false,
    },
  ]

  return (
    <section className="py-24 bg-[#0B1120]" id="pricing">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-400 bg-blue-500/10 rounded-full px-4 py-1.5 border border-blue-500/20">
              Precios
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Empieza gratis, escala cuando quieras
            </h2>
            <p className="mt-4 text-gray-400 text-lg">Sin tarjeta de credito. Sin compromiso.</p>
          </div>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 0.1}>
              <div className={`relative rounded-2xl p-7 border ${plan.popular ? "border-blue-500 shadow-xl shadow-blue-500/10 bg-gray-900/80" : "border-white/10 bg-gray-900/40"}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Mas popular
                  </span>
                )}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white`}>
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-white text-2xl font-bold">{plan.price}</span>
                      <span className="text-gray-400 text-sm">{plan.period}</span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-3 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-gray-300 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25"
                      : "border border-white/20 text-white hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const faqs = [
    {
      q: "Es realmente gratis?",
      a: "Si. El plan gratis incluye hasta 50 transacciones mensuales, 2 cuentas, 3 presupuestos y 3 metas. Sin tarjeta de credito, sin prueba limitada en tiempo.",
    },
    {
      q: "Mis datos estan seguros?",
      a: "Toda la conexion esta encriptada con HTTPS. Tu contrasena esta hasheada con bcrypt. No compartimos tus datos con terceros.",
    },
    {
      q: "Puedo usar Zentra con otra persona?",
      a: "Si. Con el plan Familia puedes invitar hasta 5 personas mas. Cada quien tiene su vista personal, y comparten una vista familiar con presupuestos y metas en comun.",
    },
    {
      q: "Puedo cambiar de plan cuando quiera?",
      a: "Si. Puedes upgrade o downgrade en cualquier momento desde configuracion. Si bajas a Gratis, tus datos se mantienen pero se aplican los limites del plan.",
    },
    {
      q: "Que monedas soporta?",
      a: "USD, EUR, GBP, MXN, COP, ARS, CLP, PEN, BRL y VES. Puedes cambiar la moneda desde configuracion en cualquier momento.",
    },
    {
      q: "Puedo exportar mis datos?",
      a: "Si. Exporta tus transacciones a CSV desde la seccion de registros. En el plan Pro y Familia la exportacion es ilimitada.",
    },
    {
      q: "Puedo dividir gastos con amigos sin ser familia?",
      a: "Si. La funcion de dividir gastos es independiente de la familiar. Crea un grupo, invita amigos por email, y empieza a dividir. Gratis con 1 grupo de hasta 3 personas.",
    },
    {
      q: "Que tipos de division hay?",
      a: "Hay tres tipos: igual para todos (gratis), por porcentaje, y por monto exacto. Tambien puedes simplificar deudas automaticamente para minimizar los pagos.",
    },
    {
      q: "Puedo gastos recurrentes como el alquiler?",
      a: "Si. En el plan Pro puedes crear gastos compartidos recurrentes (mensual, semanal, etc.) que se registran automaticamente.",
    },
  ]

  return (
    <section className="py-24 bg-[#F8FAFC]" id="faq">
      <div className="max-w-3xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-14">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 rounded-full px-4 py-1.5">
              FAQ
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Preguntas frecuentes
            </h2>
          </div>
        </FadeIn>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FadeIn key={faq.q.slice(0, 20)} delay={i * 0.05}>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={20} className="text-gray-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-4 text-gray-500 leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-24 bg-[#0B1120] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent" />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Empieza a gestionar tu dinero en minutos
          </h2>
          <p className="mt-4 text-gray-400 text-lg">
            Sin tarjeta de credito. Sin configuracion complicada. Registrate y listo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              Crear cuenta gratis
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Conoce mas
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-[#070B18] border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="text-white font-semibold">Zentra</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">Precios</a>
            <a href="#faq" className="hover:text-gray-300 transition-colors">FAQ</a>
          </div>
          <p className="text-xs text-gray-600">
            Built by Angelo
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Zentra. Todas las funciones, un solo lugar.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main>
      <Nav />
      <HeroSection />
      <ProblemsSection />
      <FeaturesSection />
      <SplitsSection />
      <ExtraFeaturesStrip />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  )
}