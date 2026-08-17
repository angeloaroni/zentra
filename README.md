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

### 1. Autenticación
- Login y registro con JWT
- Reset de contraseña por email (Resend)
- Categorías por defecto al registrarse

### 2. Transacciones
- CRUD completo con búsqueda y filtros
- Filtros por fecha, categoría, tag, cuenta, tipo
- Export a CSV
- Transacciones recurrentes automáticas

### 3. Cuentas
- Gestión de cuentas bancarias (checking, savings, credit, cash, investment)
- Balance auto-actualizado por transacciones
- Balance total consolidado

### 4. Categorías
- CRUD con iconos y colores
- Tipos: INCOME, EXPENSE, BOTH
- Categorías por defecto al registrarse

### 5. Presupuestos (Pro)
- Seguimiento de progreso (gastado vs monto)
- Alertas al 80% y 100% del presupuesto

### 6. Metas (Pro)
- Metas con monto objetivo y fecha límite
- Contribuciones a metas

### 7. Tags/Eventos (Pro)
- Etiquetas para transacciones con presupuesto
- Alertas de presupuesto por evento

### 8. Dividir gastos (Splits)
- Grupos con miembros
- 3 tipos de división: Igual, Porcentaje, Monto exacto
- Balances por persona con desglose
- Transferencias óptimas (algoritmo de simplificación de deudas)
- Pagos (settlements) con auto-creación de transacciones
- Gastos recurrentes compartidos
- Tickets/facturas (base64 en DB)
- Invitaciones por email a no registrados
- Compartir por WhatsApp

### 9. Dashboard
- Score de salud financiera (0-100)
- Insights y anomalías de gasto
- Patrimonio neto histórico
- Cashflow mensual
- Resumen de cuentas y metas

### 10. Notificaciones
- Notificaciones in-app con redirección
- Tipos: invitaciones, gastos, settlements, presupuestos

### 11. Logros
- Sistema de gamificación con puntos
- 10 logros desbloqueables

### 12. Admin
- Panel de administración
- Gestión de usuarios y planes

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
