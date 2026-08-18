export type HelpSection = "dashboard" | "transactions" | "splits" | "accounts" | "budgets" | "goals" | "events" | "settings"

export interface HelpContent {
  title: string
  intro: string
  steps: string[]
  tip?: string
}

export const HELP_CONTENT: Record<HelpSection, HelpContent> = {
  dashboard: {
    title: "Cómo usar tu dashboard",
    intro: "Consulta tu situación financiera en un solo vistazo.",
    steps: ["Revisa tu balance, ingresos y gastos del periodo.", "Consulta tu score de salud e insights.", "Usa patrimonio neto, cashflow y metas para planificar."],
    tip: "Registra tus movimientos con frecuencia para mantener las métricas actualizadas.",
  },
  transactions: {
    title: "Cómo usar tus registros",
    intro: "Controla cada ingreso y gasto de forma sencilla.",
    steps: ["Pulsa Nuevo registro para añadir un ingreso o gasto.", "Usa el periodo para ver Este mes, meses anteriores o un rango personalizado.", "Combina los filtros de tipo, recurrentes, cuenta, categoría y evento.", "Exporta los resultados a CSV cuando lo necesites."],
    tip: "Los ingresos recurrentes y gastos recurrentes se generan automáticamente en cada periodo.",
  },
  splits: {
    title: "Cómo dividir gastos",
    intro: "Comparte gastos sin hacer cálculos manuales ni perseguir recibos.",
    steps: ["Crea un grupo y añade a sus miembros.", "Invita por email o comparte el enlace por WhatsApp.", "Registra el gasto y selecciona quién pagó.", "Elige división igual, por porcentaje o por importe exacto.", "Consulta Lo que debes y Te deben para ver el saldo real.", "Registra pagos para dejar las deudas saldadas."],
    tip: "Las transferencias óptimas son solo informativas: reducen el número de pagos y pueden mostrar importes distintos al consumo directo.",
  },
  accounts: {
    title: "Cómo usar tus cuentas",
    intro: "Organiza tu dinero por cuenta, efectivo, ahorro o inversión.",
    steps: ["Crea una cuenta con su saldo inicial.", "Vincula cada registro a la cuenta correspondiente.", "Consulta el saldo individual y el total consolidado."],
  },
  budgets: {
    title: "Cómo usar presupuestos",
    intro: "Define límites para evitar sorpresas a final de mes.",
    steps: ["Crea un presupuesto por categoría y periodo.", "Registra tus gastos con esa categoría.", "Revisa el progreso y las alertas al 80% y 100%."],
  },
  goals: {
    title: "Cómo usar tus metas",
    intro: "Convierte tus objetivos de ahorro en un plan visible.",
    steps: ["Crea una meta con importe objetivo y fecha límite.", "Añade contribuciones cuando ahorres.", "Consulta el porcentaje completado y el progreso."],
  },
  events: {
    title: "Cómo usar eventos",
    intro: "Agrupa gastos relacionados con un viaje, proyecto o actividad.",
    steps: ["Crea un evento con un presupuesto opcional.", "Asocia registros al evento.", "Consulta el gasto acumulado y sus alertas."],
  },
  settings: {
    title: "Cómo usar configuración",
    intro: "Personaliza tu cuenta y tus preferencias.",
    steps: ["Actualiza tu perfil y contraseña.", "Gestiona familia, moneda y preferencias.", "Consulta tu plan y la facturación."],
  },
}

export function getHelpSection(pathname: string): HelpSection {
  if (pathname.startsWith("/dashboard/transactions")) return "transactions"
  if (pathname.startsWith("/dashboard/splits")) return "splits"
  if (pathname.startsWith("/dashboard/accounts")) return "accounts"
  if (pathname.startsWith("/dashboard/budgets")) return "budgets"
  if (pathname.startsWith("/dashboard/goals")) return "goals"
  if (pathname.startsWith("/dashboard/events")) return "events"
  if (pathname.startsWith("/dashboard/settings")) return "settings"
  return "dashboard"
}
