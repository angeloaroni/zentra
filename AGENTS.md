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
- **Database**: **PostgreSQL** via Prisma ORM (Neon)
- **Email**: Resend API for transactional emails
- **Auth**: JWT-based (`@nestjs/jwt`, `bcrypt`)
- Swagger docs: `http://localhost:3001/api/docs`

## Production Deployment

| Service | Provider | URL |
|---------|----------|-----|
| Frontend | Vercel (free) | `https://zentra-web-one.vercel.app` |
| Backend | Render (free) | `https://zentra-api-c20o.onrender.com/api` |
| Database | Neon (free, 3GB) | PostgreSQL via `DATABASE_URL` |
| Email | Resend (free tier) | `onboarding@resend.dev` |

### Deploy Process
1. Push to GitHub → Vercel & Render auto-deploy
2. Render uses Dockerfile at repo root for monorepo build
3. Vercel serves `apps/web` with `NEXT_PUBLIC_API_URL` pointing to Render
4. Neon DB migrations: `npx prisma db push --skip-generate` runs on Render startup

### Environment Variables

**Backend (Render)**:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - JWT signing key
- `JWT_EXPIRES_IN` - Token expiry (default: `7d`)
- `RESEND_API_KEY` - Resend API key for emails
- `SMTP_FROM` - Sender email (e.g., `Zentra <onboarding@resend.dev>`)
- `NEXT_PUBLIC_APP_URL` - Frontend URL for email links (`https://zentra-web-one.vercel.app`)
- `NODE_ENV` - `production`
- `PORT` - `3001`

**Frontend (Vercel)**:
- `NEXT_PUBLIC_API_URL` - Backend URL (`https://zentra-api-c20o.onrender.com/api`)
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` - Stripe price ID for Pro plan
- `NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID` - Stripe price ID for Family plan

## Key Gotchas

- **PostgreSQL, not SQLite** - schema uses `provider = "postgresql"` (migrated from SQLite for production)
- `PlanLimitsService` in `subscriptions/plan-limits.service.ts` - enforces free tier limits
- `@Plan()` decorator in `subscriptions/plan.decorator.ts` - shorthand for `@SetMetadata(PLAN_KEY, [...])`
- `CheckoutSessionDto` accepts real Stripe price IDs (not just 'pro'/'family')
- After schema changes: run `npm run db:generate` then `npm run db:push`
- API `.env` is at `apps/api/.env` (not root)
- API uses `class-validator` with `whitelist: true` and `forbidNonWhitelisted: true` - unknown fields are rejected
- CORS is `origin: true` (all origins, JWT auth handles security)
- API listens on `0.0.0.0` (required for Docker/Render)
- Route ordering critical: `@Get('summary')` and `@Get('by-category')` MUST come before `@Get(':id')` in controllers
- PrismaService doesn't auto-connect on init (lazy connection)
- Keep-alive ping at `/api/health` every 13 min prevents Render free tier from sleeping
- **Email lookups are case-insensitive** - login, register, forgot-password, and invite all use `mode: 'insensitive'`
- **Register normalizes email to lowercase** before saving
- **NestJS exceptions only** - never use `throw new Error()` in services, always use `NotFoundException`, `BadRequestException`, `ForbiddenException` etc.
- `npm run dev` from root can have Next.js workspaces error (non-blocking, use separate terminals)

## App Structure

- Backend entry: `apps/api/src/main.ts`
- Backend modules: `apps/api/src/modules/{auth,users,families,transactions,categories,budgets,goals,accounts,recurring,tags,subscriptions,admin}/`
- Frontend entry: `apps/web/src/app/page.tsx` (landing page, redirects to `/login` for auth)
- Prisma schema: `apps/api/prisma/schema.prisma`
- Dockerfile: root-level `Dockerfile` for Render deployment
- Render config: `render.yaml` at repo root

## Backend Modules

### Auth
- JWT login/register with bcrypt
- Default categories seeded on registration
- Auto-create `Subscription` record on registration (plan: free)
- Forgot password + reset password endpoints with email via Resend
- Email lookups are case-insensitive
- Guards: JwtAuthGuard, RolesGuard

### Transactions
- CRUD with search, date range, recurring filter, tag filtering
- CSV export via `/transactions/export`
- `GET /transactions/summary` - total income, expense, balance
- `GET /transactions/by-category` - expense by category (pie chart data)
- `GET /transactions/cashflow` - income vs expenses over 6 months (line chart)
- `GET /transactions/comparison` - month vs previous month with % change arrows
- `GET /transactions/by-tag/:tagId` - transactions by tag for current month
- Recurring transactions auto-generated via setInterval (hourly check)

### Tags (Eventos)
- CRUD for tagging transactions (e.g., "Cumpleanos de Sofia")
- Family-aware: personal (`familyId: null`) or family (`familyId: set`)
- Budget tracking per tag (monthly)
- Budget alerts at 80% and 100%
- Notifications created automatically when tag budget exceeded
- Endpoints: POST/GET/PATCH/DELETE `/tags`
- `GET /tags/:id/details` - detailed tag with stats (MUST come before `GET /tags/:id`)

### Categories
- CRUD with color and icon fields
- `GET /categories/default` - returns default categories (MUST come before `GET /categories/:id`)
- `GET /categories/by-type` - filter by INCOME/EXPENSE/BOTH

### Budgets
- CRUD with progress tracking (spent vs amount)
- Alerts for overspending (>80% or >100%)
- Edit limited to amount field only (backend PATCH only supports amount)

### Goals (Metas)
- CRUD with target amount and deadline
- `POST /goals/:id/contribute` - add funds to goal
- Progress calculated as percentage

### Accounts (Carteras)
- CRUD with balance tracking, color, icon, type
- `GET /accounts/total-balance` - sum of all accounts
- Edit functionality with pencil icon

### Recurring
- Auto-generates transactions based on frequency (daily/weekly/monthly/yearly)
- Prevents duplicate creation
- Uses native `setInterval` in `OnModuleInit`

### Families
- CRUD: create, update, list members
- Invite by email (case-insensitive lookup, must be registered)
- Remove members (cannot remove creator)
- `POST /users/join-family` - join by family ID
- `POST /users/leave-family` - leave current family
- Roles: ADMIN (creator) and USER
- All data services (transactions, categories, budgets, goals, accounts) are family-aware
- `family-access.helper.ts` - shared utility for resolving member IDs
- **Fixed**: family creation sets `user.familyId` + creates `FamilyMember` with ADMIN role
- **Fixed**: `inviteMember` sets `user.familyId` on the invited user

### Subscriptions
- CRUD with Stripe integration (checkout, portal, cancel, plan change)
- PlanGuard: `free=0 < pro=1 < family=2` hierarchy, applied via `@Plan()` decorator
- `PlanGuard` registered in `SubscriptionsModule`, exported and imported by modules that need it
- `PlanLimitsService` enforces free tier limits: 50 txns/mo, 2 accounts, 3 budgets, 3 goals
- `GET /subscriptions/usage` - returns plan usage vs limits for current user
- Plan-restricted endpoints:
  - **Tags**: all endpoints require `pro` plan
  - **Budgets**: all endpoints require `pro` plan
  - **Goals**: all endpoints require `pro` plan
  - **Families**: all endpoints require `family` plan
  - **Transactions**: `cashflow`, `comparison`, `by-tag/:tagId` require `pro` plan
  - **Users**: `join-family`, `leave-family` require `family` plan
- Webhook handler for Stripe events (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed)
- Free plan auto-created on registration
- Stripe raw body handling via `bodyParser: false` + custom verify in `main.ts`
- CheckoutSessionDto accepts real Stripe price IDs (removed `@IsIn` validation)

### Notifications
- `NotificationsModule` with controller, service
- `GET /notifications` - list user notifications (with read/unread filter)
- `GET /notifications/unread-count` - badge count for top-nav
- `PATCH /notifications/mark-all-read` - mark all as read
- `PATCH /notifications/:id/read` - mark single as read
- `DELETE /notifications/:id` - delete single notification
- `DELETE /notifications` - clear all notifications
- Auto-created on tag budget alerts (80% and 100%)
- Top-nav bell icon with unread badge count and dropdown

### Admin
- `GET /admin/stats` - total users, by plan, transactions, families, income/expense
- `GET /admin/users` - list all users with search, includes plan, family, transaction count
- `PATCH /admin/users/:id/plan` - change user plan (free/pro/family)
- `DELETE /admin/users/:id` - delete user account (cascade)
- Protected by `AdminGuard` (requires `user.role === 'ADMIN'`)
- `{PlanGuard}`: ADMIN role bypasses all plan restrictions
- Accessible via `/dashboard/admin` (visible in top-nav only for ADMIN role)

### Email (Resend)
- `EmailService` + `EmailModule` in `common/services/`
- `sendPasswordResetEmail()` sends HTML email with reset link
- Uses `NEXT_PUBLIC_APP_URL` for reset URL (production) or falls back to `localhost:3000`
- When `RESEND_API_KEY` not set, logs reset URL to console (dev mode)

### Family Data Sharing Pattern
- **CRITICAL RULE**: personal transactions = `familyId: null`; family transactions = explicit `familyId`
- Personal view: queries filter by `familyId: null` (user's own only)
- Family view: queries filter by `familyId = [familyId]` (all family members)
- `getScopeUserIds(prisma, userId, familyId)` returns `[userId]` or all member IDs
- Frontend passes `familyId: activeFamilyId ? activeFamilyId : null` on all create operations
- Backend does NOT auto-assign familyId - only when explicitly passed from frontend

## Frontend Structure

### Pages
- `/` - Landing page (marketing, Hero, Features, Pricing, FAQ)
- `/login` - Login/Register
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form (token from email)
- `/dashboard` - Main dashboard with balance card, comparison tags, cashflow line chart, top categories
- `/dashboard/accounts` - Account management with colored cards
- `/dashboard/transactions` - Transaction list with search, CSV export, recurring filter, advanced filters (min/max amount, category, payment method, tag)
- `/dashboard/categories` - Category CRUD with color picker
- `/dashboard/budgets` - Budget with progress bars
- `/dashboard/goals` - Goals with contributions
- `/dashboard/events` - Events/tags list with progress bars and budget tracking
- `/dashboard/events/[id]` - Event detail with transactions and stats
- `/dashboard/settings` - Currency setting
- `/dashboard/settings/profile` - Edit name, change password, delete account
- `/dashboard/settings/family` - Family management (create, join, invite, leave)
- `/dashboard/settings/billing` - Billing/subscription management (current plan, upgrade, cancel)
- `/dashboard/onboarding` - First-use setup wizard (create account, first transaction)
- `/dashboard/admin` - Admin panel (users, stats, plan changes) - ADMIN role only
- `/pricing` - Pricing page (3 tiers: Gratis, Pro, Familia)

### Key Components
- `providers.tsx` - QueryClient + ThemeProvider (dark mode)
- `top-nav.tsx` - Horizontal top nav with mobile hamburger menu, "Admin" link visible only for ADMIN role, notification bell
- `theme-toggle.tsx` - Dark/light mode toggle button
- `family-switcher.tsx` - Personal/family view toggle in top nav
- `date-range-picker.tsx` - Preset date ranges (current month, last month, last 3/6 months, current year, all)
- `tag-input.tsx` - Tag/event selector with autocomplete and inline creation
- `error-boundary.tsx` - React error boundary with Spanish-language fallback
- `toast.tsx` - Custom toast system with success/error/warning variants

### Lib
- `lib/api.ts` - API client with JWT auth, 401 redirect to `/login`, versioned localStorage keys (`zentra-token:v1`, `zentra-user:v1`)
- `lib/settings.ts` - Zustand store for global currency, `formatMoney(n, currency)` with symbol at END
- `lib/family.ts` - Zustand store for active family (persists to localStorage)
- `lib/utils.ts` - `cn()` helper for className merging

## Design System

- **Primary color**: Blue (`blue-600`) - modern, sober, elegant
- **Landing page**: Alternating dark/light sections with framer-motion animations
- **Cards**: `border-0 rounded-xl shadow-sm` (unified across all pages)
- **Dark mode**: Next-themes with `class` strategy, toggle in top nav
- **Currency**: Global setting in Zustand, symbol at END (e.g., `1,250.00 $`)
- **Mobile**: Responsive with hamburger menu, cards stack vertically, flex-wrap for overflow prevention
- **Mobile patterns**: `text-2xl sm:text-4xl` for large numbers, `min-w-0 truncate` for text in flex layouts, `shrink-0` for buttons, `flex-col sm:flex-row` for forms on mobile

## Design System - Events/Tags

- **Colors**: 12 preset colors matching the app palette
- **Icons**: 20 Lucide-based icons (cake, gift, heart, plane, etc.)
- **Budget**: Monthly per event, null = "Sin limite"
- **Notifications**: Automatic at 80% and 100% of budget

## Design System - Landing Page

- **Hero** (dark `#0B1120`): "Tus finanzas, claras de una vez" + dashboard mockup
- **Problemas** (light `#F8FAFC`): 3 pain points with icons
- **Features** (dark): 3 visual blocks alternating text/screenshot
- **Extra features strip** (light): currencies, security, dark mode, speed
- **Precios** (dark): 3 tiers - Gratis/Pro/Familia with "Mas popular" badge
- **FAQ** (light): Accordion with animated answers
- **CTA** (dark): "Empieza a gestionar tu dinero en minutos"
- **Footer** (dark): Links + "Built by Angelo" sutil
- **Animations**: Framer Motion fade-in on scroll, accordion for FAQ
- **Responsive**: Hamburger nav on mobile, stacked sections

## Tech Stack

- Frontend: Next.js 14, TypeScript, TailwindCSS, Recharts, Zustand, React Query, Radix UI, Lucide icons, next-themes, framer-motion
- Backend: NestJS, Prisma, class-validator, Swagger, Resend
- DB: PostgreSQL (Neon) in production, SQLite compatible for dev
- Deploy: Vercel (frontend), Render (backend), Neon (database)

## Current Status

### Done
- Full monorepo setup
- Complete DB schema (User, Family, FamilyMember, Transaction, Category, Budget, Goal, Account, Tag, Notification, Subscription)
- Auth (JWT + bcrypt + default categories seed)
- All CRUD modules with search/filter
- Dashboard with charts (pie, line, comparison tags) and summary
- Horizontal top nav with mobile hamburger
- Dark mode toggle (theme provider wired, toggle component added)
- Currency as global setting
- Route ordering fixes
- CSV export
- Recurring transaction auto-generation
- **Family switcher** - shows "Mi cuenta" always + family list when available; gracefully handles 403 from PlanGuard
- Family management UI (create, join, invite, leave) at `/dashboard/settings/family`
- Family switcher in top nav (personal/family view toggle)
- Profile settings (edit name, change password, delete account)
- Comparison endpoint (month vs previous month with % change arrows)
- Cashflow chart (income vs expenses line chart over 6 months)
- Advanced transaction filters (min/max amount, category, payment method)
- Family data separation: personal = `familyId: null`, family = explicit `familyId`
- **Tags/Events system** - tag transactions with events, track budget per event, notifications at 80%/100%
- **Email service** - Resend integration for password reset emails
- **Forgot password + reset password** - full flow with email link
- **Subscriptions module** - Stripe checkout/portal/cancel/webhook with PlanGuard
- **Plan enforcement** - PlanGuard + @Plan() decorator on protected routes; PlanLimitsService for free-tier limits
- **Billing page** - `/dashboard/settings/billing` with plan cards, usage, manage billing, cancel
- **Notifications UI** - bell icon with unread badge, dropdown with mark-as-read, delete, clear all
- **Onboarding flow** - `/dashboard/onboarding` 3-step wizard (welcome, create account, first transaction)
- **Accessibility** - skip link, Escape key handlers on dropdowns, `aria-hidden` on backdrops, `prefers-reduced-motion` CSS + framer-motion, alt text on AvatarImage
- **React quality** - functional setState (no stale closures), localStorage key versioning, escaped `new Date()` hydration mismatches, `<Link>` for internal nav
- **SEO** - Open Graph meta, Twitter cards, sitemap.xml, robots.txt, metadataBase
- **Stripe setup guide** - `STRIPE_SETUP.md` with product/price/webhook configuration steps
- **Admin bypass** - ADMIN role bypasses PlanGuard and PlanLimitsService restrictions
- **Landing page** - Hero, Problems, Features, Pricing, FAQ, CTA, Footer with framer-motion
- **Admin panel** - `/dashboard/admin` with stats, user table, plan changes, delete user (ADMIN role only)
- **Edit functionality** - transactions, accounts, budgets can be edited inline
- **Production deployment** - Vercel (frontend), Render (backend), Neon (PostgreSQL)
- **Mobile responsive fixes** - overflow prevention, flex-wrap, responsive text sizing, truncated titles across all dashboard pages
- **Case-insensitive email** - login, register, forgot-password, family invite all use `mode: 'insensitive'`

### Fixed Bugs
- **FamilyId separation**: create methods no longer auto-assign user's familyId; personal transactions stay personal
- **removeChild error**: `setShowForm(false)` in `onSuccess` wrapped with `setTimeout` to avoid React state conflict
- **NestJS exceptions**: replaced all `throw new Error()` with proper HTTP exceptions (NotFoundException, BadRequestException, ForbiddenException) in families service
- **Case-insensitive emails**: all email lookups use `mode: 'insensitive'`, register normalizes to lowercase
- **Admin dropdown overflow**: fixed z-index/scrollbar issue by using fixed positioning
- **Mobile overflow**: dashboard balance card, transaction rows, action buttons, color pickers, contribute forms all properly responsified
- **CheckoutSessionDto**: removed `@IsIn(['pro', 'family'])` validation - now accepts real Stripe price IDs
- **PlanGuard activation**: registered in SubscriptionsModule, `@Plan()` decorator applied to tags, budgets, goals, families, transactions (cashflow/comparison/by-tag), users (join-family/leave-family)
- **Admin PlanGuard bypass**: ADMIN role returns true immediately, skipping plan checks
- **Notification bell**: FamilySwitcher always visible (shows "Mi cuenta" when no families or 403)

### Next
- Group expense splitting (Splitwise-style)
- Export to PDF
- Stripe live mode activation (create products, prices, webhook in Stripe dashboard)