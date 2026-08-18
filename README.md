# Zentra - App de Finanzas Personales

Zentra es una aplicación web de finanzas personales que permite gestionar tus finanzas, dividir gastos con amigos o familiares, y obtener insights sobre tus hábitos de consumo.

**Producción:** [zentra-web-one.vercel.app](https://zentra-web-one.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-red?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Railway-336791?logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)
![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest)
![Stripe](https://img.shields.io/badge/Stripe-Integration-635BFF?logo=stripe)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)
![Deploy](https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway)

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS |
| **Backend** | NestJS, Prisma ORM, TypeScript |
| **Base de datos** | PostgreSQL (Railway) |
| **Autenticación** | JWT + bcrypt |
| **Email** | Resend |
| **Pagos** | Stripe |
| **Gráficos** | Recharts (dynamic import) |
| **Estado** | Zustand, React Query |
| **UI** | Radix UI, Lucide, next-themes |
| **Deploy** | Vercel (frontend), Railway (backend + DB) |
| **Testing** | Jest, Supertest |
| **Monorepo** | TurboRepo + npm workspaces |

---

## Instalación y ejecución

### Prerrequisitos

- Node.js >= 18
- PostgreSQL (o usar Railway)
- Cuenta en Resend (para emails)
- Cuenta en Stripe (para pagos, opcional)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/angeloaroni/zentra.git
cd zentra

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Copiar el archivo de ejemplo y completar con tus valores
cp apps/api/.env.example apps/api/.env

# 4. Generar el cliente Prisma
npm run db:generate

# 5. Aplicar el schema a la base de datos
npm run db:push

# 6. Iniciar en modo desarrollo
npm run dev
```

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar frontend y backend en modo desarrollo |
| `npm run build` | Compilar todas las aplicaciones |
| `npm test` | Ejecutar tests del backend |
| `npm run lint` | Ejecutar linter |
| `npm run db:generate` | Regenerar cliente Prisma |
| `npm run db:push` | Aplicar cambios del schema a la DB |
| `npm run db:studio` | Abrir Prisma Studio (UI para la DB) |

---

## Estructura del proyecto

```
zentra/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── src/
│   │   │   ├── main.ts               # Entry point
│   │   │   ├── app.module.ts         # Módulo raíz
│   │   │   ├── common/               # Guards, servicios compartidos
│   │   │   ├── database/             # Config Prisma
│   │   │   └── modules/              # 19 módulos del backend
│   │   │       ├── auth/             # Login, register, JWT
│   │   │       ├── users/            # Gestión de usuarios
│   │   │       ├── families/         # Grupos familiares
│   │   │       ├── transactions/     # Transacciones
│   │   │       ├── categories/       # Categorías
│   │   │       ├── budgets/          # Presupuestos (Pro)
│   │   │       ├── goals/            # Metas (Pro)
│   │   │       ├── accounts/         # Cuentas bancarias
│   │   │       ├── recurring/        # Transacciones recurrentes
│   │   │       ├── tags/             # Tags/Eventos (Pro)
│   │   │       ├── subscriptions/    # Suscripciones Stripe
│   │   │       ├── splits/           # Dividir gastos
│   │   │       ├── notifications/    # Notificaciones
│   │   │       ├── net-worth/        # Patrimonio neto
│   │   │       ├── insights/         # Insights financieros
│   │   │       ├── health/           # Score de salud
│   │   │       ├── reports/          # Reportes
│   │   │       ├── achievements/     # Logros
│   │   │       └── admin/            # Panel admin
│   │   └── prisma/
│   │       └── schema.prisma         # Schema de la DB
│   │
│   └── web/                          # Frontend Next.js 14
│       ├── src/
│       │   ├── app/                  # App Router (páginas)
│       │   │   ├── page.tsx          # Landing page
│       │   │   ├── login/            # Login/Register
│       │   │   ├── dashboard/        # Panel principal
│       │   │   │   ├── transactions/ # Transacciones
│       │   │   │   ├── accounts/     # Cuentas
│       │   │   │   ├── categories/   # Categorías
│       │   │   │   ├── budgets/      # Presupuestos
│       │   │   │   ├── goals/        # Metas
│       │   │   │   ├── splits/       # Dividir gastos
│       │   │   │   ├── events/       # Tags/Eventos
│       │   │   │   ├── settings/     # Configuración
│       │   │   │   └── admin/        # Panel admin
│       │   │   └── pricing/          # Precios
│       │   ├── components/           # Componentes React
│       │   └── lib/                  # Utilidades (api, settings, family)
│       └── public/                   # Assets estáticos
│
├── turbo.json                        # Config TurboRepo
├── Dockerfile                        # Para deploy en Railway
├── AGENTS.md                         # Documentación del proyecto
└── package.json                      # Workspaces del monorepo
```

---

## Funcionalidades principales

### Secciones de la aplicación y planes

Resumen de qué puedes hacer en cada sección, para qué sirve y qué plan requiere.

| Sección | Plan | Límites |
|---------|------|---------|
| Panel | Gratis | — |
| Cuentas | Gratis | 2 cuentas |
| Registros | Gratis | 50 transacciones/mes |
| Categorías | Gratis | — |
| Moneda global | Gratis | 10 divisas |
| Presupuestos | **Pro** | — |
| Metas | **Pro** | — |
| Eventos | **Pro** | — |
| Dividir | **Pro** | — |
| Familia | **Familia** | 6 miembros |

### 1. Panel (Gratis)
- **Para qué sirve:** es tu centro de control financiero. Reúne en una sola vista un resumen completo de tu situación sin necesidad de entrar a cada sección.
- **Qué puedes hacer:**
  - Balance del periodo: tarjeta con ingresos, gastos y tasa de ahorro (%) del mes o del rango de fechas seleccionado (DateRangePicker).
  - 4 métricas rápidas con comparación vs. periodo anterior: ingresos, gastos, balance y metas activas (flechas ▲/▼ de mejora o empeoramiento).
  - Flujo de caja de los últimos 6 meses: gráfico de barras ingresos vs gastos.
  - Gastos por categoría: gráfico circular + ranking "Dónde va tu dinero" (top 3 categorías con % del total).
  - Metas de ahorro: mini-progreso de las metas en curso.
  - Salud financiera: score 0-100 con etiqueta (Excelente/Bueno/Regular/Mejorable).
  - División de gastos: resumen de "te deben / debes" entre grupos.
  - Insights: alertas inteligentes de anomalías (p. ej. gasto en una categoría +30%).
  - Patrimonio neto: gráfico histórico de evolución (12 meses).
  - Últimos registros: transacciones recientes con acceso rápido a "Ver todo" / "Agregar primera transacción".
  - Exportar resumen a CSV (métricas + categorías).
- **Valor:** visibilidad inmediata de tu situación financiera y tendencias; te dice dónde está tu dinero y si estás mejor o peor que el mes pasado, todo en una sola pantalla.
- **Costo:** Gratis.

### 2. Cuentas (Gratis · 2 cuentas)
- **Para qué sirve:** representa tus cuentas del mundo real (efectivo, tarjeta, ahorro, inversión) para saber cuánto dinero tienes realmente y en qué.
- **Qué puedes hacer:**
  - Crear cuentas con tipo (cuenta corriente, ahorro, tarjeta de crédito, efectivo, inversiones), color e icono.
  - Editar/eliminar cuentas.
  - Ver balance de cada cuenta, actualizado automáticamente: cada transacción vinculada suma (ingreso) o resta (gasto) su saldo.
  - Total balance agregado de todas tus cuentas (`/accounts/total-balance`).
- **Valor:** sabes tu dinero real disponible en cada lugar y de forma agregada. El balance se mantiene solo gracias a los registros, sin matemática manual.
- **Costo:** Gratis, con límite de 2 cuentas en plan Gratis. Ilimitadas en Pro/Familia.

### 3. Registros (Gratis · 50 transacciones/mes)
- **Para qué sirve:** es el corazón de la app — registrar cada ingreso y gasto. Todo lo demás (presupuestos, categorías, gráficos, metas) se alimenta de aquí.
- **Qué puedes hacer:**
  - CRUD completo: crear, editar, eliminar transacciones con tipo (ingreso/gasto), título, monto, fecha, categoría, cuenta, descripción y método de pago.
  - Transacciones recurrentes: marcar como recurrente (diaria, semanal, mensual, anual) → el backend la auto-genera.
  - Búsqueda por texto (con debounce) y filtros avanzados: tipo, rango de fechas, categoría, cuenta, método de pago, tag/evento, monto mínimo/máximo, solo recurrentes.
  - Paginación (50 por página) y exportar a CSV.
  - Selector de cuenta para filtrar el saldo de una cuenta concreta.
  - Vista personal vs familiar (si estás en plan Familia).
- **Valor:** es donde capturas tu vida financiera. Con buenos registros obtienes análisis precisos en el Panel, presupuestos reales y control del gasto.
- **Costo:** Gratis, con límite de 50 transacciones/mes en Gratis. Pro/Familia: ilimitadas. Funciones avanzadas solo Pro: cashflow, comparison (comparar periodos) y filtro/lista por tag.

### 4. Categorías (Gratis)
- **Para qué sirve:** organiza tus transacciones en grupos (Alimentación, Transporte, Ocio, Sueldo...) con color e icono, para que los análisis tengan sentido.
- **Qué puedes hacer:**
  - CRUD completo: crear categorías con nombre, tipo (INGRESO/GASTO/AMBOS), icono y color.
  - Categorías por defecto pre-cargadas al registrarse (comodidad inicial).
  - Las categorías alimentan el gráfico circular del Panel, presupuestos y filtros.
- **Valor:** estructura tus datos. Sin categorías, no hay análisis "dónde va tu dinero" ni presupuestos por categoría.
- **Costo:** Gratis, sin límites de cantidad ni restricción de plan.

### 5. Presupuestos (Pro)
- **Para qué sirve:** poner un límite de gasto mensual a una categoría y controlar cuánto te queda antes de excederte.
- **Qué puedes hacer:**
  - Crear presupuestos por mes/año y categoría, con monto máximo.
  - Ver progreso en tiempo real: barras de gastado vs monto, % consumido, restante y si estás por encima del límite (over budget).
  - Editar/eliminar presupuestos.
  - Alertas automáticas cuando superas el 80% y el 100%.
- **Valor:** evita que el dinero se "filtre" sin darte cuenta. Te avisa antes de llegar al límite para que ajustes el gasto a tiempo.
- **Costo:** Pro (4,99€/mes) — todo el módulo requiere plan Pro.

### 6. Metas (Pro)
- **Para qué sirve:** ahorrar para objetivos concretos (viaje, coche, emergencias) con seguimiento visual del progreso.
- **Qué puedes hacer:**
  - Crear metas con nombre, monto objetivo, fecha límite (opcional), descripción y color.
  - Contribuir dinero: `POST /goals/:id/contribute` para sumar fondos a una meta y ver el % alcanzado.
  - Ver progreso: barra de avance, monto acumulado vs objetivo, días restantes hasta la fecha límite, marcado de meta completada.
  - Editar/eliminar metas.
- **Valor:** convierte el ahorro en algo tangible y motivador: ves el progreso hacia cada objetivo y cuánto te falta.
- **Costo:** Pro (4,99€/mes) — todo el módulo requiere plan Pro. En Gratis la página muestra "Plan Pro requerido".

### 7. Eventos (Pro)
- **Para qué sirve:** etiquetar transacciones de un "evento" (cumpleaños, boda, viaje, navidad) para agrupar gastos que no encajan en una categoría y controlar su presupuesto específico.
- **Qué puedes hacer:**
  - CRUD de eventos/tags con nombre, color, icono y presupuesto asignado.
  - Asignar tags a transacciones (componente TagInput con autocompletado) y ver las transacciones de cada evento.
  - Estadísticas por evento: gastado, nº de transacciones, primera/última fecha, promedio por transacción.
  - Alertas de presupuesto al 80% y 100% → crean notificaciones automáticas (campana).
  - Detalle del evento (`/events/[id]`) con su desglose.
- **Valor:** útil para gastos "temáticos" o temporales con su propio techo de gasto, manteniendo la categoría limpia. P. ej.: "Fiesta de cumpleaños" puede tener gastos en varias categorías pero un solo presupuesto global.
- **Costo:** Pro (4,99€/mes) — todo el módulo requiere plan Pro.

### 8. Dividir (Pro)
- **Para qué sirve:** gestionar gastos compartidos con otras personas (viajes, cenas, piso compartido) sin cálculos manuales ni conflictos.
- **Qué puedes hacer:**
  - **Lista de grupos:**
    - Crear grupos (viaje, cena, piso) con nombre, descripción y color.
    - Resumen global: tarjetas "te deben" / "debes" sumando todos los grupos.
  - **Dentro de un grupo:**
    - Invitar miembros por email (envía email a no registrados + enlace de invitación, compartible por WhatsApp con 7 días de validez).
    - Registrar gastos compartidos con 3 modos de división: EQUAL (a partes iguales), PERCENTAGE (% por persona) y EXACT (monto exacto por persona).
    - Quién pagó: campo `paidBy` para registrar gastos en nombre de otro miembro.
    - Items: itemizar un gasto en productos y asignar quién consume cada uno (`POST/DELETE /splits/expenses/:id/items`).
    - Tickets/fotos: subir recibo del gasto (base64 en DB).
    - Balances: consumo directo (lo que debes a cada persona con desglose) + transferencias óptimas (algoritmo que simplifica las deudas al mínimo de movimientos).
    - Settlements: registrar pagos entre miembros → auto-crea una transacción con el nombre del pagador.
    - Marcar como pagado: toggle `isPaid` en los gastos.
    - Gastos recurrentes compartidos: auto-generación programada (mensual/semanal).
    - Plantillas: guardar configuraciones de división para reutilizarlas.
    - Conversión de divisas: tasas de cambio y conversión de montos (`/splits/currencies/convert`).
    - Notificaciones con redirección al grupo (invitación, gasto, settlement).
    - Cada miembro tiene color único en sus avatares para identificarlos rápido.
- **Valor:** elimina las deudas mal recordadas y los "¿quién debe qué?". Todo queda registrado, saldado y con el mínimo de transferencias posibles. Es la feature más completa de la app.
- **Costo:** Pro (4,99€/mes) — todo el módulo requiere plan Pro.

### Monedas / Divisas (Gratis · conversión Pro)
- **Para qué sirve:** poder registrar y ver tu dinero en la moneda que uses, con soporte latinoamericano y conversión cuando participas en grupos de gasto en otra moneda.
- **Qué puedes hacer:**
  - Moneda global (Gratis, sin límites): elegir entre 10 monedas desde Configuración → Moneda global — USD, EUR, GBP, MXN, COP, ARS, CLP, PEN, BRL y VES. Se aplica a transacciones, presupuestos, metas y todos los gráficos (el formato pone el símbolo de la moneda, p. ej. `1.250,00 €`).
  - Conversión en Dividir (Pro): cada grupo tiene su propia moneda, y el detalle del grupo muestra la opción "Mostrar en [tu moneda]", convirtiendo automáticamente los montos (`/splits/currencies/convert`). Las tasas son fijas y mantenidas en el backend (EUR=1, USD=1.08, GBP=0.86, MXN=19.5, COP=4200, ARS=950, CLP=950, PEN=3.8, BRL=5.4, VES=36).
  - Las cuentas y transacciones también pueden guardar su propia moneda (el grupo usa la del grupo, no la tuya global).
- **Costo:** moneda global Gratis; conversión en grupos requiere Pro.

### Plan Familia (Familia · 7,99€/mes)
- **Para qué sirve:** gestionar las finanzas de forma compartida con tu pareja o familia: datos, cuentas, gastos y objetivos en un solo lugar, con vista personal y familiar.
- **Qué puedes hacer** (Configuración → Familia):
  - Crear familia con nombre y unirse por código (`POST /users/join-family`).
  - Invitar miembros por email (búsqueda case-insensitive) y eliminar/abandonar la familia.
  - Roles: Admin / Miembro, con gestión de miembros.
  - Hasta 6 miembros en una misma familia.
  - Vista personal ↔ familiar: el conmutador `family-switcher` alterna entre "Mi cuenta" y la familia activa; cada sección (Panel, Cuentas, Registros, Categorías, Presupuestos, Metas, Eventos) filtra sus datos por `familyId` y permite crear datos compartidos.
  - Incluye todo lo del plan Pro (presupuestos, metas, eventos, splits, conversión, alertas, export CSV ilimitado).
- **Valor:** es el plan para hogares: en lugar de multiplicar cuentas con registros duplicados, toda la casa ve los mismos números en tiempo real, con permisos claros (admin/miembro) y la posibilidad de seguir usando tu vista personal cuando quieras.

### Autenticación
- Login y registro con JWT, reset de contraseña por email (Resend), categorías por defecto al registrarse.

### Notificaciones
- In-app con redirección: invitaciones, gastos, settlements y alertas de presupuesto.

### Logros
- Gamificación con puntos y 10 logros desbloqueables.

### Admin
- Panel de administración con gestión de usuarios y planes.

> Los planes se gestionan en **Configuración → Plan y facturación** (pagos vía Stripe). Jerarquía: `free (0€) < pro (4,99€/mes) < family (7,99€/mes)`; `family` incluye todo lo de `pro`.

---

## Usuario de prueba

| Campo | Valor |
|-------|-------|
| **Email** | `test@test123.com` |
| **Contraseña** | `123456` |

---

## Despliegue

| Servicio | Proveedor | URL |
|----------|-----------|-----|
| Frontend | Vercel | [zentra-web-one.vercel.app](https://zentra-web-one.vercel.app) |
| Backend | Railway | [zentra-api-production-dee5.up.railway.app](https://zentra-api-production-dee5.up.railway.app) |
| Base de datos | Railway | PostgreSQL |

### Variables de entorno

**Backend (Railway):**
- `DATABASE_URL` - URL de PostgreSQL
- `JWT_SECRET` - Secret para JWT (mínimo 16 caracteres)
- `JWT_EXPIRES_IN` - Duración del token (ej: 7d)
- `RESEND_API_KEY` - API key de Resend para emails
- `SMTP_FROM` - Email remitente (ej: Zentra <noreply@tu-dominio.com>)
- `FRONTEND_URL` - URL del frontend (ej: https://zentra-web-one.vercel.app)
- `NODE_ENV` - production
- `PORT` - Puerto (Railway lo asigna automáticamente)

**Frontend (Vercel):**
- `NEXT_PUBLIC_API_URL` - URL del backend + /api (ej: https://zentra-api-production-dee5.up.railway.app/api)

---

## Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
cd apps/api && npm run test:cov
```

Tests actuales: **19 tests** del algoritmo de simplificación de deudas.

---

## Accesibilidad

El proyecto cumple con WCAG 2.2 AA:
- Botones con `aria-label`
- Formularios con labels vinculados
- Modales con focus trap (Radix UI)
- Contraste de color 4.5:1 mínimo
- Touch targets de 44px mínimo
- Navegación por teclado
- Skip links y landmarks `<main>`
