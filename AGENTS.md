# Zentra - App de Finanzas Personales

## Comandos Rapidos

```bash
npm install            # Instalar dependencias
npm run dev            # Iniciar ambas apps (turbo)
npm run build          # Compilar todas las apps
npm run db:generate    # Regenerar cliente Prisma
npm run db:push        # Aplicar cambios de schema a la DB
npm run db:studio      # Abrir Prisma Studio
```

## Arquitectura

- **Monorepo**: TurboRepo con npm workspaces
- **apps/api**: Backend NestJS, prefijo global `/api`
- **apps/web**: Frontend Next.js 14
- **Base de datos**: PostgreSQL via Prisma ORM (Neon)
- **Email**: API Resend para emails transaccionales
- **Auth**: JWT (`@nestjs/jwt`, `bcrypt`)

## Despliegue en Produccion

| Servicio | Proveedor | URL |
|----------|-----------|-----|
| Frontend | Vercel | `https://zentra-web-one.vercel.app` |
| Backend | Render | `https://zentra-api-c20o.onrender.com/api` |
| Base de datos | Neon | PostgreSQL via `DATABASE_URL` |

### Proceso de Despliegue
1. Push a GitHub → Vercel y Render despliegan automaticamente
2. Render usa el Dockerfile en la raiz del repo
3. Migraciones Neon: `npx prisma db push --skip-generate` al iniciar Render

### Variables de Entorno

**Backend (Render)**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RESEND_API_KEY`, `SMTP_FROM`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`, `PORT`

**Frontend (Vercel)**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`, `NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID`

## Puntos Clave

- **PostgreSQL, no SQLite** - `provider = "postgresql"` en el schema
- Despues de cambios al schema: `npm run db:generate` y luego `npm run db:push`
- El `.env` de la API esta en `apps/api/.env` (no en la raiz)
- La API usa `class-validator` con `whitelist: true`, `forbidNonWhitelisted: false`
- CORS lista origenes especificos (Vercel + localhost), no `origin: true`
- La API escucha en `0.0.0.0` (requerido para Docker/Render)
- **Orden de rutas critico**: `@Get('summary')` DEBE ir antes de `@Get(':id')`
- **Busquedas de email son case-insensitive** (`mode: 'insensitive'`)
- **Solo excepciones NestJS** - nunca `throw new Error()`, usar siempre `NotFoundException` etc.
- `npm run dev` desde la raiz puede dar error de workspaces (no bloquea, usar terminales separados)
- `bodyParser: false` en main.ts es necesario para webhooks de Stripe
- Rate limiting: 100 req/min global, 3-5 req/min en endpoints de auth (throttler)
- Headers de seguridad Helmet habilitados, `contentSecurityPolicy: false` por compatibilidad
- Swagger oculto en produccion (`NODE_ENV !== 'production'` solamente)
- Variables de entorno validadas al inicio con schema Joi (falla rapido si falta `JWT_SECRET` o `DATABASE_URL`)

## Estructura de la App

- Entry del backend: `apps/api/src/main.ts`
- Modulos del backend: `apps/api/src/modules/{auth,users,families,transactions,categories,budgets,goals,accounts,recurring,tags,subscriptions,admin,notifications,splits,net-worth,insights,health,reports,achievements}/`
- Entry del frontend: `apps/web/src/app/page.tsx` (landing page)
- Schema Prisma: `apps/api/prisma/schema.prisma`
- Dockerfile: en la raiz para despliegue en Render

## Modulos del Backend

### Auth
- Login/register con JWT + bcrypt
- Categorias por defecto al registrarse
- Auto-crear registro `Subscription` al registrar (plan: free)
- Olvidar password + resetear password con email via Resend
- Rate limited: 3 req/min register, 5 req/min login, 3 req/min forgot-password

### Transacciones
- CRUD con busqueda, rango de fechas, filtro recurrente, filtro por tags, **filtro por cuenta**
- Campo `accountId` vincula transaccion a cuenta → **auto-actualiza saldo de cuenta**
- Logica de balance: INCOME → `+amount`, EXPENSE → `-amount` en crear/editar/eliminar
- Export CSV, auto-generacion recurrente, scoping familiar
- Endpoints: summary, by-category, cashflow (pro), comparison (pro), by-tag (pro)

### Cuentas
- CRUD con seguimiento de balance, color, icono, tipo
- **Balance auto-actualizado por transacciones**
- `GET /accounts/total-balance` - suma de todas las cuentas
- Tipos: checking, savings, credit, cash, investment

### Categorias
- CRUD con color, icono, tipo (INCOME/EXPENSE/BOTH)
- `GET /categories/default` - categorias por defecto (DEBE ir antes de `GET /categories/:id`)

### Presupuestos
- CRUD con seguimiento de progreso (gastado vs monto)
- Alertas por exceso (>80% o >100%)
- Requiere plan `pro`

### Metas
- CRUD con monto objetivo y fecha limite
- `POST /goals/:id/contribute` - agregar fondos a la meta
- Requiere plan `pro`

### Tags (Eventos)
- CRUD para etiquetar transacciones con seguimiento de presupuesto
- Alertas de presupuesto al 80% y 100% → crear notificaciones automaticamente
- `GET /tags/:id/details` (DEBE ir antes de `GET /tags/:id`)
- Requiere plan `pro`

### Familias
- CRUD con invitacion por email (case-insensitive), remover miembros
- `family-access.helper.ts` - utilidad compartida para resolver IDs de miembros
- **Patron de datos familiares**: personal = `familyId: null`, familiar = `familyId` explicito
- Requiere plan `family`

### Subscripciones
- Stripe checkout/portal/cancel/webhook
- PlanGuard: jerarquia `free=0 < pro=1 < family=2`
- `PlanLimitsService`: 50 txns/mes, 2 cuentas, 3 presupuestos, 3 metas para gratis
- Restricciones por plan: tags, presupuestos, metas (pro), familias (family), splits (pro)

### Notificaciones
- Auto-creadas en alertas de presupuesto de tags, invitaciones/gastos/settlements de splits
- Icono de campana con conteo no leidos, marcar-leido, limpiar-todo

### Dividir Gastos (Splits)
- Independiente de familias (funciona con cualquier usuario registrado)
- Requiere plan `pro`
- **Grupos**: CRUD con invitacion por email, gestion de miembros
- **Gastos**: 3 tipos de division: EQUAL, PERCENTAGE, EXACT
- **Tickets**: Base64 almacenado en DB (campos `receiptData`, `receiptMime`)
- **Balances**: Algoritmo de simplificacion de deudas (minimiza transfers)
- **Settlements**: Registrar pagos → auto-crear Transaction
- **Recurrentes**: Auto-generar gastos compartidos en horario
- **Plantillas**: Guardar configuraciones de division comunes
- Toggle `isPaid` en splits de gastos (marcar/desmarcar como pagado)
- Notificaciones: `SPLIT_INVITE`, `SPLIT_EXPENSE`, `SPLIT_SETTLEMENT`

### Patrimonio Neto
- `GET /net-worth?months=12` - snapshots historicos de balance
- `GET /net-worth/current` - balance total actual
- Modelo `NetWorthSnapshot` para seguimiento en el tiempo

### Insights
- `GET /insights` - anomalias de gasto, aumentos por categoria, proyeccion de ahorro
- Auto-deteccion de patrones inusuales (>30% aumento en categoria)

### Score de Salud
- `GET /health-score` - score 0-100 con desglose
- 4 componentes: tasa de ahorro, fondo de emergencia, diversificacion, consistencia
- Etiquetas: Excelente (80+), Bueno (60-79), Regular (40-59), Mejorable (<40)

### Reportes
- `GET /reports/weekly-digest` - comparacion semana a semana, top categorias
- `GET /reports/monthly?month=X&year=Y` - resumen mensual con categorias

### Logros
- `GET /achievements` - desbloqueados + disponibles + puntos
- `POST /achievements/check` - auto-verificar y desbloquear nuevos logros
- 10 logros: FIRST_TRANSACTION, STREAK_7/30, SAVINGS_100/500, GOAL_50/100, FIRST_SPLIT, DIVERSIFIED, BUDGET_MASTER

### Email (Resend)
- `EmailService` en `common/services/`
- `sendPasswordResetEmail()` con link de reset
- Cuando `RESEND_API_KEY` no esta configurado, loguea la URL de reset en consola (modo dev)

## Estructura del Frontend

### Paginas
- `/` - Landing page (marketing con animaciones framer-motion)
- `/login` - Login/Register
- `/forgot-password` / `/reset-password` - Flujo de reset de password
- `/dashboard` - Panel principal: tarjeta de balance, score de salud, insights, grafico de patrimonio, cashflow, categorias, metas, transacciones recientes
- `/dashboard/accounts` - Gestion de cuentas con tarjetas de color
- `/dashboard/transactions` - Lista de transacciones con busqueda, export CSV, **selector de cuenta**, filtro recurrente, filtros avanzados
- `/dashboard/categories` - CRUD de categorias con selector de color
- `/dashboard/budgets` - Presupuestos con barras de progreso (Pro)
- `/dashboard/goals` - Metas con contribuciones (Pro)
- `/dashboard/events` - Lista de eventos/tags (Pro)
- `/dashboard/splits` - Lista de grupos de division con resumen de balances (Pro)
- `/dashboard/splits/[groupId]` - Detalle del grupo: gastos, balances, historial, miembros, recurrentes
- `/dashboard/settings/*` - Perfil, familia, facturacion
- `/dashboard/admin` - Panel de admin (solo rol ADMIN)
- `/dashboard/onboarding` - Asistente de configuracion en 3 pasos

### Componentes Clave
- `top-nav.tsx` - Nav horizontal con hamburger movil, link admin, campana de notificaciones, item "Dividir"
- `family-switcher.tsx` - Toggle vista personal/familiar
- `skeleton.tsx` - Componentes de skeleton de carga (Card, Transaction, Account, Category, Budget)
- `confirm-dialog.tsx` - Dialogo de confirmacion reutilizable (Radix Dialog)
- `fade-in.tsx` - Animacion fade-in al hacer scroll
- `toast.tsx` - Sistema de notificaciones toast
- `tag-input.tsx` - Selector de tag/evento con autocompletado

### Lib
- `api.ts` - Cliente API con auth JWT, `uploadFile()` para uploads en base64
- `settings.ts` - Store Zustand para moneda global (EUR por defecto), `formatMoney()`
- `family.ts` - Store Zustand para familia activa

## Sistema de Diseno

- **Color primario**: Azul (`blue-600`)
- **Moneda**: EUR (€) con simbolo al FINAL (ej: `1.250,00 €`)
- **Tarjetas**: `border-0 rounded-xl shadow-sm`
- **Modo oscuro**: Next-themes con estrategia `class`
- **Movil**: Responsive con hamburger menu, `text-2xl sm:text-4xl` para numeros grandes, `min-w-0 truncate` para texto
- **Targets de toque**: 44px minimo en todos los botones interactivos
- **Estados de carga**: Componentes skeleton (nunca texto plano "Cargando...")
- **Estados vacios**: Icono + texto descriptivo + boton CTA
- **Confirmaciones**: Dialogo ConfirmAction (nunca `window.confirm()`)
- **Feedback toast**: Todas las operaciones CRUD muestran toasts de exito/error

## Secciones de la Landing Page

- **Hero** (oscuro): "Tus finanzas, claras de una vez" + mockup del dashboard con montos en EUR
- **Problemas** (claro): 3 puntos de dolor incluyendo "Dividir gastos no tiene por que ser complicado"
- **Features** (oscuro): 4 bloques: Panel, Presupuestos, Metas, Dividir gastos
- **Seccion Splits** (claro): "Finanzas compartidas sin dramas" con mockup de grupo/gastos/balances
- **Precios** (oscuro): 3 tiers con precios en EUR (0€, 4,99€, 7,99€)
- **FAQ** (claro): Acordeon con preguntas sobre splits
- Sin referencias a Splitwise en ningun lugar

## Stack Tecnico

- Frontend: Next.js 14, TypeScript, TailwindCSS, Recharts, Zustand, React Query, Radix UI, Lucide, next-themes, framer-motion
- Backend: NestJS, Prisma, class-validator, Swagger, Resend, helmet, throttler, Joi (validacion de env)
- DB: PostgreSQL (Neon)
- Deploy: Vercel (frontend), Render (backend), Neon (database)
