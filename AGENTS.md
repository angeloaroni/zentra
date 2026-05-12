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
- **apps/api**: NestJS backend (port 3001), global prefix `/api`
- **apps/web**: Next.js 14 frontend (port 3000)
- **Database**: **SQLite** via Prisma ORM (file: `apps/api/prisma/zentra.db`)
- Swagger docs: `http://localhost:3001/api/docs`

## Key Gotchas

- **SQLite, not PostgreSQL** - schema uses `provider = "sqlite"`, enums are stored as strings
- After schema changes: run `npm run db:generate` then `npm run db:push`
- API `.env` is at `apps/api/.env` (not root)
- API uses `class-validator` with `whitelist: true` and `forbidNonWhitelisted: true` - unknown fields are rejected
- CORS origin defaults to `http://localhost:3000`
- Route ordering critical: `@Get('summary')` and `@Get('by-category')` MUST come before `@Get(':id')` in controllers
- PrismaService doesn't auto-connect on init (lazy connection)
- `npm run dev` from root can have Next.js workspaces error (non-blocking, use separate terminals)

## App Structure

- Backend entry: `apps/api/src/main.ts`
- Backend modules: `apps/api/src/modules/{auth,users,families,transactions,categories,budgets,goals,accounts,recurring,tags}/`
- Frontend entry: `apps/web/src/app/page.tsx`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Auth: JWT-based (`@nestjs/jwt`, `bcrypt`)

## Backend Modules

### Auth
- JWT login/register with bcrypt
- Default categories seeded on registration
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
- CRUD for tagging transactions (e.g., "Cumpleaños de Sofía")
- Family-aware: personal (`familyId: null`) or family (`familyId: set`)
- Budget tracking per tag (monthly)
- Budget alerts at 80% and 100%
- Notifications created automatically when tag budget exceeded
- Endpoints: POST/GET/PATCH/DELETE `/tags`

### Categories
- CRUD with color and icon fields

### Budgets
- CRUD with progress tracking (spent vs amount)
- Alerts for overspending (>80% or >100%)

### Goals (Metas)
- CRUD with target amount and deadline
- `POST /goals/:id/contribute` - add funds to goal
- Progress calculated as percentage

### Accounts (Carteras)
- CRUD with balance tracking, color, icon, type
- `GET /accounts/total-balance` - sum of all accounts

### Recurring
- Auto-generates transactions based on frequency (daily/weekly/monthly/yearly)
- Prevents duplicate creation
- Uses native `setInterval` in `OnModuleInit`

### Families
- CRUD: create, update, list members
- Invite by email, remove members
- `POST /users/join-family` - join by family ID
- `POST /users/leave-family` - leave current family
- Roles: ADMIN (creator) and USER
- All data services (transactions, categories, budgets, goals, accounts) are family-aware
- `family-access.helper.ts` - shared utility for resolving member IDs

### Family Data Sharing Pattern
- **CRITICAL RULE**: personal transactions = `familyId: null`; family transactions = explicit `familyId`
- Personal view: queries filter by `familyId: null` (user's own only)
- Family view: queries filter by `familyId = [familyId]` (all family members)
- `getScopeUserIds(prisma, userId, familyId)` returns `[userId]` or all member IDs
- Frontend passes `familyId: activeFamilyId ? activeFamilyId : null` on all create operations
- Backend does NOT auto-assign familyId - only when explicitly passed from frontend

## Frontend Structure

### Pages
- `/` - Login/Register
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

### Key Components
- `providers.tsx` - QueryClient + ThemeProvider (dark mode)
- `top-nav.tsx` - Horizontal top nav with mobile hamburger menu
- `theme-toggle.tsx` - Dark/light mode toggle button
- `family-switcher.tsx` - Personal/family view toggle in top nav
- `date-range-picker.tsx` - Preset date ranges (current month, last month, last 3/6 months, current year, all)
- `tag-input.tsx` - Tag/event selector with autocomplete and inline creation

### Lib
- `lib/api.ts` - API client with JWT auth, 401 redirect
- `lib/settings.ts` - Zustand store for global currency, `formatMoney(n, currency)` with symbol at END
- `lib/family.ts` - Zustand store for active family (persists to localStorage)
- `lib/utils.ts` - `cn()` helper for className merging

## Design System

- **Primary color**: Blue (`blue-600`) - modern, sober, elegant
- **Cards**: `border-0 rounded-xl shadow-sm` (unified across all pages)
- **Dark mode**: Next-themes with `class` strategy, toggle in top nav
- **Currency**: Global setting in Zustand, symbol at END (e.g., `1,250.00 $`)
- **Mobile**: Responsive with hamburger menu, cards stack vertically

## Design System - Events/Tags

- **Colors**: 12 preset colors matching the app palette
- **Icons**: 20 Lucide-based icons (cake, gift, heart, plane, etc.)
- **Budget**: Monthly per event, null = "Sin límite"
- **Notifications**: Automatic at 80% and 100% of budget

## Tech Stack

- Frontend: Next.js 14, TypeScript, TailwindCSS, Recharts, Zustand, React Query, Radix UI, Lucide icons, next-themes
- Backend: NestJS, Prisma, class-validator, Swagger
- DB: SQLite (dev), easily swappable to PostgreSQL by changing provider in schema
- Skills: autoskills (18 skills including accessibility, seo, frontend-design, nestjs-best-practices, prisma-*, turborepo, react-*, next-*, typescript-advanced-types, nodejs-backend-patterns)

## Current Status

### Done
- Full monorepo setup
- Complete DB schema (User, Family, FamilyMember, Transaction, Category, Budget, Goal, Account, Tag, Notification)
- Auth (JWT + bcrypt + default categories seed)
- All CRUD modules with search/filter
- Dashboard with charts (pie, line, comparison tags) and summary
- Horizontal top nav with mobile hamburger
- Dark mode toggle (theme provider wired, toggle component added)
- Currency as global setting
- Route ordering fixes
- CSV export
- Recurring transaction auto-generation
- **Family data sharing** - all services (transactions, categories, budgets, goals, accounts) support family-aware queries
- Family management UI (create, join, invite, leave) at `/dashboard/settings/family`
- Family switcher in top nav (personal/family view toggle)
- Profile settings (edit name, change password, delete account)
- Comparison endpoint (month vs previous month with % change arrows)
- Cashflow chart (income vs expenses line chart over 6 months)
- Advanced transaction filters (min/max amount, category, payment method)
- Family data separation: personal = `familyId: null`, family = explicit `familyId`
- **Tags/Events system** - tag transactions with events, track budget per event, notifications at 80%/100%

### Fixed Bugs
- **FamilyId separation**: create methods no longer auto-assign user's familyId; personal transactions stay personal
- **removeChild error**: `setShowForm(false)` in `onSuccess` wrapped with `setTimeout` to avoid React state conflict

### Next
- Group expense splitting (Splitwise-style)
- Onboarding flow
- Export to PDF
- Notification system
- Notification UI page to view and manage notifications
