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

### Panel (Gratis)
- **Para qué sirve:** centro de control con toda tu situación financiera en una vista.
- Balance del periodo con ingresos, gastos y tasa de ahorro; selector de rango de fechas.
- Métricas rápidas con comparación vs. periodo anterior, flujo de caja (6 meses) y gastos por categoría.
- Score de salud financiera (0-100), insights de anomalías y patrimonio neto histórico.
- Resumen de metas, de "te deben/debes" en dividir gastos y últimos registros.
- Exportar resumen a CSV.

### Cuentas (Gratis · 2 cuentas)
- **Para qué sirve:** reflejar tus cuentas reales (efectivo, tarjeta, ahorro, inversión) y saber tu dinero disponible.
- Tipos: checking, savings, credit, cash, investment, con color e icono.
- Balance auto-actualizado por las transacciones + total consolidado.
- Ilimitadas en Pro/Familia.

### Registros (Gratis · 50 transacciones/mes)
- **Para qué sirve:** capturar cada ingreso y gasto; alimenta todos los análisis.
- CRUD con búsqueda, filtros avanzados (tipo, fecha, categoría, cuenta, método de pago, tag, monto), transacciones recurrentes automáticas y export a CSV.
- Funciones Pro: cashflow, comparación de periodos y listado por tag.

### Categorías (Gratis)
- **Para qué sirve:** organizar tus transacciones para que los análisis tengan sentido.
- CRUD con icono y color, tipos INCOME/EXPENSE/BOTH y categorías por defecto al registrarse.

### Moneda global (Gratis)
- **Para qué sirve:** usar tu moneda en toda la app, con soporte latinoamericano.
- 10 divisas: USD, EUR, GBP, MXN, COP, ARS, CLP, PEN, BRL, VES.
- Se aplica a transacciones, presupuestos, metas y gráficos; los grupos de división tienen su propia moneda y conversión automática (Pro).

### Presupuestos (Pro)
- **Para qué sirve:** poner un límite mensual de gasto por categoría y controlarlo.
- Progreso en tiempo real (gastado vs monto) con alertas al 80% y 100%.

### Metas (Pro)
- **Para qué sirve:** ahorrar hacia objetivos concretos con seguimiento visual.
- Monto objetivo, fecha límite, contribuciones y % alcanzado.

### Eventos (Pro)
- **Para qué sirve:** agrupar gastos de un evento/cumpleaños/viaje bajo un mismo presupuesto.
- Tags con presupuesto propio, alertas al 80%/100% y estadísticas por evento (gastado, promedio, fechas).

### Dividir (Pro)
- **Para qué sirve:** gestionar gastos compartidos (viajes, cenas, piso) sin cálculos manuales.
- Grupos con invitaciones por email/WhatsApp, 3 modos de división (Igual, Porcentaje, Monto exacto) y quién pagó.
- Items por persona, tickets (base64), balances con desglose y transferencias óptimas.
- Settlements con auto-creación de transacciones, gastos recurrentes compartidos, plantillas y conversión de monedas.

### Familia (Familia · 7,99€/mes)
- **Para qué sirve:** finanzas compartidas para hogares.
- Hasta 6 miembros, roles (Admin/Miembro), invitar por email o enlace.
- Vista personal ↔ familiar con datos compartidos en todas las secciones.
- Incluye todo lo de Pro.

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
