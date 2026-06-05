# Zentra - Personal Finance App

## Quick Commands

```bash
npm install            # Install all dependencies
npm run dev            # Start both apps (turbo)
npm run build          # Build all apps
npm run db:generate    # Regenerate Prisma client
npm run db:push        # Push schema changes to DB
npm run db:studio      # Open Prisma Studio
```

## Architecture

- **Monorepo**: TurboRepo with npm workspaces
- **apps/api**: NestJS backend, global prefix `/api`
- **apps/web**: Next.js 14 frontend
- **Database**: PostgreSQL via Prisma ORM (Neon)
- **Email**: Resend API for transactional emails
- **Auth**: JWT-based (`@nestjs/jwt`, `bcrypt`)

## Production Deployment

| Service | Provider | URL |
|---------|----------|-----|
| Frontend | Vercel | `https://zentra-web-one.vercel.app` |
| Backend | Render | `https://zentra-api-c20o.onrender.com/api` |
| Database | Neon | PostgreSQL via `DATABASE_URL` |

### Deploy Process
1. Push to GitHub → Vercel & Render auto-deploy
2. Render uses Dockerfile at repo root
3. Neon DB migrations: `npx prisma db push --skip-generate` on Render startup

### Environment Variables

**Backend (Render)**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RESEND_API_KEY`, `SMTP_FROM`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`, `PORT`

**Frontend (Vercel)**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`, `NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID`

## Key Gotchas

- **PostgreSQL, not SQLite** - `provider = "postgresql"` in schema
- After schema changes: `npm run db:generate` then `npm run db:push`
- API `.env` is at `apps/api/.env` (not root)
- API uses `class-validator` with `whitelist: true`, `forbidNonWhitelisted: false`
- CORS whitelists specific origins (Vercel + localhost), not `origin: true`
- API listens on `0.0.0.0` (required for Docker/Render)
- Route ordering critical: `@Get('summary')` MUST come before `@Get(':id')`
- **Email lookups are case-insensitive** (`mode: 'insensitive'`)
- **NestJS exceptions only** - never `throw new Error()`, always `NotFoundException` etc.
- `npm run dev` from root can have Next.js workspaces error (non-blocking, use separate terminals)
- `bodyParser: false` in main.ts is needed for Stripe webhooks
- Rate limiting: 100 req/min global, 3-5 req/min on auth endpoints (throttler)
- Helmet security headers enabled, `contentSecurityPolicy: false` for compatibility
- Swagger hidden in production (`NODE_ENV !== 'production'` only)
- Env vars validated at startup with Joi schema (fails fast if missing `JWT_SECRET` or `DATABASE_URL`)

## App Structure

- Backend entry: `apps/api/src/main.ts`
- Backend modules: `apps/api/src/modules/{auth,users,families,transactions,categories,budgets,goals,accounts,recurring,tags,subscriptions,admin,notifications,splits,net-worth,insights,health,reports,achievements}/`
- Frontend entry: `apps/web/src/app/page.tsx` (landing page)
- Prisma schema: `apps/api/prisma/schema.prisma`
- Dockerfile: root-level `Dockerfile` for Render deployment

## Backend Modules

### Auth
- JWT login/register with bcrypt
- Default categories seeded on registration
- Auto-create `Subscription` record on registration (plan: free)
- Forgot password + reset password with email via Resend
- Rate limited: 3 req/min register, 5 req/min login, 3 req/min forgot-password

### Transactions
- CRUD with search, date range, recurring filter, tag filtering, **account filtering**
- `accountId` field links transaction to account → **auto-updates account balance**
- Balance logic: INCOME → `+amount`, EXPENSE → `-amount` on create/update/delete
- CSV export, recurring auto-generation, family-aware scoping
- Endpoints: summary, by-category, cashflow (pro), comparison (pro), by-tag (pro)

### Accounts
- CRUD with balance tracking, color, icon, type
- **Balance auto-updated by transactions** (Phase 1)
- `GET /accounts/total-balance` - sum of all accounts
- Types: checking, savings, credit, cash, investment

### Categories
- CRUD with color, icon, type (INCOME/EXPENSE/BOTH)
- `GET /categories/default` - default categories (MUST come before `GET /categories/:id`)

### Budgets
- CRUD with progress tracking (spent vs amount)
- Alerts for overspending (>80% or >100%)
- Requires `pro` plan

### Goals (Metas)
- CRUD with target amount and deadline
- `POST /goals/:id/contribute` - add funds to goal
- Requires `pro` plan

### Tags (Eventos)
- CRUD for tagging transactions with budget tracking
- Budget alerts at 80% and 100% → auto-create notifications
- `GET /tags/:id/details` (MUST come before `GET /tags/:id`)
- Requires `pro` plan

### Families
- CRUD with invite by email (case-insensitive), remove members
- `family-access.helper.ts` - shared utility for resolving member IDs
- **Family data pattern**: personal = `familyId: null`, family = explicit `familyId`
- Requires `family` plan

### Subscriptions
- Stripe checkout/portal/cancel/webhook
- PlanGuard: `free=0 < pro=1 < family=2` hierarchy
- `PlanLimitsService`: 50 txns/mo, 2 accounts, 3 budgets, 3 goals for free
- Plan-restricted: tags, budgets, goals (pro), families (family), splits (pro)

### Notifications
- Auto-created on tag budget alerts, split invites/expenses/settlements
- Bell icon with unread count, mark-read, clear-all

### Splits (Dividir Gastos)
- Independent of families (works with any registered user)
- Requires `pro` plan
- **Groups**: CRUD with invite by email, members management
- **Expenses**: 3 split types: EQUAL, PERCENTAGE, EXACT
- **Receipts**: Base64 stored in DB (`receiptData`, `receiptMime` fields)
- **Balances**: Debt simplification algorithm (minimizes transfers)
- **Settlements**: Record payments → auto-create Transaction
- **Recurring**: Auto-generate shared expenses on schedule
- **Templates**: Save common split configurations
- Toggle `isPaid` on expense splits (mark/unmark as paid)
- Notifications: `SPLIT_INVITE`, `SPLIT_EXPENSE`, `SPLIT_SETTLEMENT`

### Net Worth
- `GET /net-worth?months=12` - historical balance snapshots
- `GET /net-worth/current` - current total balance
- `NetWorthSnapshot` model for tracking over time

### Insights
- `GET /insights` - spending anomalies, category increases, savings projection
- Auto-detects unusual spending patterns (>30% category increase)

### Health Score
- `GET /health-score` - score 0-100 with breakdown
- 4 components: savings rate, emergency fund, diversification, consistency
- Labels: Excelente (80+), Bueno (60-79), Regular (40-59), Mejorable (<40)

### Reports
- `GET /reports/weekly-digest` - week-over-week comparison, top categories
- `GET /reports/monthly?month=X&year=Y` - monthly summary with categories

### Achievements
- `GET /achievements` - unlocked + available + points
- `POST /achievements/check` - auto-check and unlock new achievements
- 10 achievements: FIRST_TRANSACTION, STREAK_7/30, SAVINGS_100/500, GOAL_50/100, FIRST_SPLIT, DIVERSIFIED, BUDGET_MASTER

### Email (Resend)
- `EmailService` in `common/services/`
- `sendPasswordResetEmail()` with reset link
- When `RESEND_API_KEY` not set, logs reset URL to console (dev mode)

## Frontend Structure

### Pages
- `/` - Landing page (marketing with framer-motion animations)
- `/login` - Login/Register
- `/forgot-password` / `/reset-password` - Password reset flow
- `/dashboard` - Main dashboard: balance card, health score, insights, net worth chart, cashflow, categories, goals, recent transactions
- `/dashboard/accounts` - Account management with colored cards
- `/dashboard/transactions` - Transaction list with search, CSV export, **account selector**, recurring filter, advanced filters
- `/dashboard/categories` - Category CRUD with color picker
- `/dashboard/budgets` - Budget with progress bars (Pro)
- `/dashboard/goals` - Goals with contributions (Pro)
- `/dashboard/events` - Events/tags list (Pro)
- `/dashboard/splits` - Split groups list with balance summary (Pro)
- `/dashboard/splits/[groupId]` - Group detail: expenses, balances, history, members, recurring
- `/dashboard/settings/*` - Profile, family, billing
- `/dashboard/admin` - Admin panel (ADMIN role only)
- `/dashboard/onboarding` - 3-step setup wizard

### Key Components
- `top-nav.tsx` - Horizontal nav with mobile hamburger, admin link, notification bell, "Dividir" nav item
- `family-switcher.tsx` - Personal/family view toggle
- `skeleton.tsx` - Loading skeleton components (Card, Transaction, Account, Category, Budget)
- `confirm-dialog.tsx` - Reusable confirmation dialog (Radix Dialog)
- `fade-in.tsx` - Scroll-triggered fade-in animation
- `toast.tsx` - Toast notification system
- `tag-input.tsx` - Tag/event selector with autocomplete

### Lib
- `api.ts` - API client with JWT auth, `uploadFile()` for base64 uploads
- `settings.ts` - Zustand store for global currency (EUR default), `formatMoney()`
- `family.ts` - Zustand store for active family

## Design System

- **Primary color**: Blue (`blue-600`)
- **Currency**: EUR (€) with symbol at END (e.g., `1,250.00 €`)
- **Cards**: `border-0 rounded-xl shadow-sm`
- **Dark mode**: Next-themes with `class` strategy
- **Mobile**: Responsive with hamburger menu, `text-2xl sm:text-4xl` for large numbers, `min-w-0 truncate` for text
- **Touch targets**: 44px minimum on all interactive buttons
- **Loading states**: Skeleton components (never plain "Cargando..." text)
- **Empty states**: Icon + descriptive text + CTA button
- **Confirmations**: ConfirmAction dialog (never `window.confirm()`)
- **Toast feedback**: All CRUD operations show success/error toasts

## Landing Page Sections

- **Hero** (dark): "Tus finanzas, claras de una vez" + dashboard mockup with EUR amounts
- **Problemas** (light): 3 pain points including "Dividir gastos no tiene por que ser complicado"
- **Features** (dark): 4 blocks: Panel, Presupuestos, Metas, Dividir gastos
- **Splits section** (light): "Finanzas compartidas sin dramas" with mockup showing group/expenses/balances
- **Precios** (dark): 3 tiers with EUR pricing (0€, 4,99€, 7,99€)
- **FAQ** (light): Accordion including splits questions
- No Splitwise references anywhere

## Tech Stack

- Frontend: Next.js 14, TypeScript, TailwindCSS, Recharts, Zustand, React Query, Radix UI, Lucide, next-themes, framer-motion
- Backend: NestJS, Prisma, class-validator, Swagger, Resend, helmet, throttler, Joi (env validation)
- DB: PostgreSQL (Neon)
- Deploy: Vercel (frontend), Render (backend), Neon (database)
