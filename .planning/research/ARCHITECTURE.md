# Architecture Research

**Domain:** Personal household finance web app (Next.js App Router, multi-user)
**Researched:** 2026-02-18
**Confidence:** HIGH — primary sources are official Next.js docs (updated 2026-02-16) and verified patterns from real finance app implementations.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Auth Pages   │  │  App Shell   │  │    Client Components      │  │
│  │  (login/cb)   │  │  (layout.tsx)│  │  (charts, forms, tables)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼─────────────────┼──────────────────────── ┼───────────────┘
          │  HTTP           │  RSC stream             │  Server Actions / fetch
┌─────────┼─────────────────┼─────────────────────────┼───────────────┐
│                        NEXT.JS SERVER                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Middleware / Proxy                          │  │
│  │   Route protection (cookie-based optimistic check only)       │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │               Server Components (pages, layouts)               │  │
│  │   Fetch from DAL → render HTML → stream to browser            │  │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │                                                        │
│  ┌──────────▼───────────────────────────────────────────────────┐   │
│  │               Data Access Layer (DAL)                         │   │
│  │   verifySession() → household-scoped queries → DTOs          │   │
│  └──────┬────────────┬──────────────────┬────────────────────────┘  │
│         │            │                  │                            │
│  ┌──────▼──┐  ┌──────▼──────┐  ┌───────▼──────────────────────┐   │
│  │ Server  │  │   Route     │  │     Background / AI           │   │
│  │ Actions │  │  Handlers   │  │  (CSV parse, AI categorise)   │   │
│  │ (mutations)│ (webhooks,  │  │                               │   │
│  │         │  │  external)  │  │                               │   │
│  └──────┬──┘  └──────┬──────┘  └───────┬──────────────────────┘   │
└─────────┼────────────┼──────────────────┼────────────────────────────┘
          │            │                  │
┌─────────▼────────────▼──────────────────▼────────────────────────────┐
│                          DATABASE LAYER                               │
│   PostgreSQL via Prisma ORM                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Users   │  │Households│  │Transactions│ │  Loans   │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Accounts │  │Categories│  │ Recurring │  │ Savings  │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Middleware/Proxy | Route-level access gate (optimistic cookie check only); redirect unauthenticated users | `middleware.ts` / `proxy.ts` — reads JWT cookie, no DB call |
| Server Components (pages) | Compose page from fetched data; call DAL; pass props to Client Islands | `app/(dashboard)/expenses/page.tsx` — async, no `'use client'` |
| Data Access Layer (DAL) | Single source of truth for all data queries; verifies session before every query; returns DTOs | `lib/dal/transactions.ts`, `lib/dal/households.ts` |
| Server Actions | All UI-triggered mutations (create, update, delete, import); type-safe; revalidates cache | `app/actions/transactions.ts` — `'use server'` functions |
| Route Handlers | Webhooks and any endpoint called by external services (e.g., OAuth callbacks) | `app/api/auth/callback/route.ts` |
| Client Components | Interactive UI only — charts, data tables with sorting, form inputs, file upload | `components/charts/SpendingChart.tsx` — `'use client'` |
| AI/parsing service | CSV normalisation, transaction categorisation via LLM; runs server-side | `lib/ai/categorise.ts`, called from a Server Action |
| Auth library (NextAuth / Better Auth) | Session creation, Google OAuth flow, session refresh, logout | Wraps DAL's session functions |

---

## Recommended Project Structure

```
src/
├── app/                        # Next.js App Router (routes only)
│   ├── (auth)/                 # Public auth routes — no app shell
│   │   ├── login/page.tsx
│   │   └── callback/route.ts   # Google OAuth callback
│   ├── (app)/                  # Protected routes — shared dashboard layout
│   │   ├── layout.tsx          # App shell: nav, sidebar, household switcher
│   │   ├── dashboard/page.tsx  # Overview / net-worth snapshot
│   │   ├── expenses/
│   │   │   ├── page.tsx        # Expense list + filters
│   │   │   └── import/page.tsx # CSV / AI import flow
│   │   ├── income/page.tsx
│   │   ├── loans/
│   │   │   ├── page.tsx        # Loan list
│   │   │   └── [id]/page.tsx   # Loan detail + amortisation
│   │   ├── savings/page.tsx
│   │   ├── recurring/page.tsx
│   │   ├── charts/page.tsx     # Charts & graphs overview
│   │   └── calculators/page.tsx # Prediction calculators
│   └── api/                    # Route Handlers for external consumers only
│       └── webhooks/...
├── components/
│   ├── ui/                     # Headless / shadcn primitives
│   ├── charts/                 # Recharts wrappers (all 'use client')
│   ├── forms/                  # Form components + validation display
│   ├── tables/                 # Data tables (sort, filter, pagination)
│   └── layout/                 # Nav, sidebar, household picker
├── lib/
│   ├── dal/                    # Data Access Layer — all DB queries live here
│   │   ├── session.ts          # verifySession(), getHouseholdId()
│   │   ├── transactions.ts
│   │   ├── income.ts
│   │   ├── loans.ts
│   │   ├── savings.ts
│   │   └── households.ts
│   ├── actions/                # Server Actions (mutations)
│   │   ├── transactions.ts
│   │   ├── import.ts           # CSV + AI parse → insert
│   │   ├── loans.ts
│   │   └── auth.ts
│   ├── ai/
│   │   ├── categorise.ts       # LLM call for category inference
│   │   └── parse-csv.ts        # CSV normalisation
│   ├── db/
│   │   └── index.ts            # Prisma client singleton
│   └── validations/            # Zod schemas shared by actions + forms
├── types/                      # Shared TypeScript types / DTOs
└── middleware.ts               # Optimistic route protection (cookie check only)
```

### Structure Rationale

- **`(auth)` vs `(app)` route groups:** Different root layouts — auth pages have no chrome; app pages have the full sidebar/nav shell. Both share the same URL namespace.
- **`lib/dal/`:** Every DB query goes here. Enforces session verification at data level, not just middleware. Critical for security (CVE-2025-29927 showed middleware-only protection is insufficient).
- **`lib/actions/`:** All Server Actions in one place makes it easy to audit mutations and see what triggers cache invalidation.
- **`components/charts/`:** Isolated from server code. All charting is `'use client'` because charting libraries (Recharts, Chart.js) require the DOM.
- **`lib/ai/`:** AI calls are server-only (API keys never reach the client). Called from Server Actions, not from components.

---

## Architectural Patterns

### Pattern 1: Server-First with Client Islands

**What:** Pages are Server Components by default. Data is fetched on the server, HTML is streamed to the browser. Only the parts requiring interactivity (charts, forms, sortable tables) are Client Components.

**When to use:** Everywhere. This is the App Router default; deviating from it (client-side data fetching for everything) loses the performance and security benefits.

**Trade-offs:** Simpler data flow, zero auth tokens in browser, faster initial load. Slightly more complexity in component boundaries (must be explicit about `'use client'`).

**Example:**
```typescript
// app/(app)/expenses/page.tsx — Server Component
import { getTransactions } from '@/lib/dal/transactions'
import { ExpenseTable } from '@/components/tables/ExpenseTable' // 'use client'
import { SpendingChart } from '@/components/charts/SpendingChart' // 'use client'

export default async function ExpensesPage() {
  // Runs on server — verifySession() called inside getTransactions
  const transactions = await getTransactions({ type: 'expense' })

  return (
    <div>
      <SpendingChart data={transactions} />   {/* Client Island */}
      <ExpenseTable transactions={transactions} /> {/* Client Island */}
    </div>
  )
}
```

### Pattern 2: Data Access Layer (DAL) with Household Scoping

**What:** All database queries are wrapped in a DAL that (a) verifies the session, (b) resolves the active household, and (c) scopes every query to that household. No component ever queries the DB directly.

**When to use:** Every single data fetch. No exceptions.

**Trade-offs:** Slight boilerplate overhead. Pays off immediately — eliminates an entire class of data-leakage bugs where user A sees user B's data.

**Example:**
```typescript
// lib/dal/transactions.ts
import 'server-only'
import { verifySession } from './session'
import { db } from '@/lib/db'
import { cache } from 'react'

export const getTransactions = cache(async (filters?: TransactionFilters) => {
  const { userId, householdId, viewScope } = await verifySession()

  return db.transaction.findMany({
    where: {
      householdId,
      // If personal view, filter to current user only
      ...(viewScope === 'personal' ? { userId } : {}),
      ...buildFilters(filters),
    },
    orderBy: { date: 'desc' },
  })
})
```

### Pattern 3: Server Actions for All Mutations

**What:** Form submissions, imports, creates, updates, and deletes all go through Server Actions (`'use server'` functions). No client-side fetch to an API route for internal mutations.

**When to use:** Any mutation triggered from within the Next.js app. Only use Route Handlers when an external service (webhook, mobile client) needs HTTP access.

**Trade-offs:** Automatic TypeScript types end-to-end. Integrated with Next.js cache invalidation (`revalidatePath`). Cannot be called from `GET` requests or cached.

**Example:**
```typescript
// lib/actions/transactions.ts
'use server'
import { verifySession } from '@/lib/dal/session'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TransactionSchema } from '@/lib/validations/transaction'

export async function createTransaction(formData: FormData) {
  const { householdId, userId } = await verifySession()

  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  await db.transaction.create({
    data: { ...parsed.data, householdId, userId },
  })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
}
```

### Pattern 4: Personal vs Shared View Toggle

**What:** Each page supports two scopes — "personal" (my transactions only) and "household" (all members). Scope is stored in session or URL param and threaded through DAL queries.

**When to use:** Any data that has both a personal and shared dimension (expenses, income, savings goals).

**Trade-offs:** Requires careful DAL design to avoid scope leakage. URL-param approach (`?view=personal`) is simpler to implement and shareable via link.

**Example:**
```typescript
// Scope resolved in DAL, not in the component
type ViewScope = 'personal' | 'household'

// In page.tsx, pass scope from searchParams
export default async function ExpensesPage({
  searchParams
}: { searchParams: { view?: string } }) {
  const scope: ViewScope = searchParams.view === 'personal'
    ? 'personal'
    : 'household'
  const transactions = await getTransactions({ scope })
  // ...
}
```

---

## Data Flow

### Read Flow (server-rendered page)

```
User navigates to /expenses
    ↓
middleware.ts — reads JWT cookie, redirects if no session (no DB call)
    ↓
app/(app)/expenses/page.tsx — Server Component renders
    ↓
lib/dal/transactions.ts::getTransactions()
    ↓  verifySession() → confirms session valid, extracts householdId
    ↓  Prisma query scoped to householdId (+ userId if personal view)
    ↓
Returns DTO (typed, safe subset of DB columns)
    ↓
Page passes data as props to Client Components
    ↓
HTML streamed to browser — charts hydrate, tables become interactive
```

### Write Flow (Server Action)

```
User submits add-expense form
    ↓
Client Component calls Server Action (lib/actions/transactions.ts)
    ↓
Server Action: verifySession() → validate input (Zod) → db.create()
    ↓
revalidatePath('/expenses'), revalidatePath('/dashboard')
    ↓
Next.js re-renders affected pages on next request (or immediately streams update)
    ↓
UI reflects new state
```

### CSV/AI Import Flow

```
User uploads CSV file
    ↓
Client Component sends file to Server Action (lib/actions/import.ts)
    ↓
lib/ai/parse-csv.ts — normalise CSV rows to transaction shape
    ↓
lib/ai/categorise.ts — LLM call (OpenAI/Anthropic) for category inference
    ↓
User reviews parsed + categorised preview (Client Component)
    ↓
User confirms → Server Action bulk-inserts → revalidate
```

### Auth Flow (Google OAuth)

```
User clicks "Sign in with Google"
    ↓
NextAuth / Better Auth redirects to Google
    ↓
Google callback → app/api/auth/callback/route.ts
    ↓
Auth library creates/updates User record, creates session JWT
    ↓
Session cookie set (HttpOnly, Secure, SameSite=Lax)
    ↓
Redirect to /dashboard
    ↓
All subsequent requests: middleware reads cookie (optimistic), DAL verifies (secure)
```

---

## Database Schema (Core Tables)

```
User
  id, email, name, googleId, createdAt

HouseholdMember         (join table)
  userId, householdId, role (OWNER | MEMBER | VIEWER)

Household
  id, name, currency (NOK), createdAt

Transaction             (expenses + income unified, or separate — see below)
  id, householdId, userId, type (EXPENSE | INCOME), amount (Decimal),
  date, description, categoryId, isShared, isRecurring, recurringId,
  importSource (MANUAL | CSV | AI), createdAt

Category
  id, householdId, name, type (EXPENSE | INCOME), color, icon

RecurringTemplate
  id, householdId, userId, amount (Decimal), categoryId,
  frequency (WEEKLY | MONTHLY | ANNUAL), startDate, endDate, description

Loan
  id, householdId, userId, name, principal (Decimal), interestRate,
  termMonths, startDate, loanType (MORTGAGE | STUDENT | OTHER)
  — amortisation schedule computed at query time, not stored

SavingsGoal
  id, householdId, userId, name, targetAmount (Decimal),
  currentAmount (Decimal), targetDate, isShared
```

**Key design decisions:**
- Use `Decimal` type (not `float`) for all monetary amounts to avoid floating-point rounding errors.
- `Transaction.isShared` distinguishes household-visible from personal-only entries within a household.
- Loan amortisation is calculated server-side on read (not stored as rows) to keep the schema simple and always-accurate after rate changes.
- `RecurringTemplate` generates `Transaction` rows either on-demand at read time or via a scheduled job — start with on-demand, migrate to job if performance requires.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google OAuth | Route Handler callback (`/api/auth/callback`) via NextAuth/Better Auth | Standard OAuth 2.0 PKCE flow |
| OpenAI / Anthropic API | Server Action → `lib/ai/categorise.ts` (server-only) | API key never reaches browser; rate-limit per household |
| PostgreSQL | Prisma ORM singleton in `lib/db/index.ts` | Use connection pooling (PgBouncer or Prisma Accelerate) from the start |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Component → DAL | Direct function call (same process) | DAL files marked `server-only` |
| Client Component → server | Server Action (POST) or Server Component re-render | Never import DAL into client components |
| Server Action → DB | Prisma via DAL functions | Actions call DAL, not Prisma directly |
| AI parsing → DB | Server Action orchestrates: parse → preview → confirm → insert | Two-step to give user review before commit |
| Middleware → session | Cookie read only (JWT decrypt, no DB) | DB check only in DAL, not middleware |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users (household app) | Monolith Next.js + single Postgres instance is fine. No queues needed. AI calls inline in Server Actions. |
| 100-1k users | Add connection pooling (PgBouncer / Prisma Accelerate). Cache frequent DAL reads with React `cache()`. Move AI categorisation to a background job if latency becomes noticeable. |
| 1k+ users | Extract AI/import processing to a separate worker (BullMQ + Redis). Add read replicas for analytics queries. Consider separate analytics DB if chart queries impact transactional performance. |

### Scaling Priorities

1. **First bottleneck: database connections.** Next.js serverless functions open many short-lived connections. Add Prisma Accelerate or PgBouncer before you need it — it's a config change, not a rewrite.
2. **Second bottleneck: AI import latency.** LLM calls take 2–10 seconds. Once volume grows, move to async processing with a job queue and poll for status.

---

## Anti-Patterns

### Anti-Pattern 1: Middleware-Only Auth

**What people do:** Protect routes in `middleware.ts` with a DB session lookup, assume that's sufficient.
**Why it's wrong:** CVE-2025-29927 demonstrated that middleware can be bypassed. Middleware should only do an optimistic cookie check. The real security check must happen in the DAL, close to the data.
**Do this instead:** Middleware for redirects (cookie check only). DAL `verifySession()` before every query. Both layers, always.

### Anti-Pattern 2: Client-Side Data Fetching for Everything

**What people do:** Mark pages `'use client'`, fetch transactions in `useEffect`, store in local state.
**Why it's wrong:** Auth tokens must be stored in browser (XSS risk), no server rendering, slow initial load, complex loading states.
**Do this instead:** Server Components fetch data. Only interactive UI parts are Client Components. Charts receive data as props, not via browser fetches.

### Anti-Pattern 3: Storing Amortisation Schedules as Rows

**What people do:** Pre-compute all loan payment rows and store them in the DB.
**Why it's wrong:** If interest rate or term changes, all rows are stale. Schema bloat for large loans (360 rows per mortgage).
**Do this instead:** Compute amortisation on read from `principal`, `interestRate`, `termMonths`, `startDate`. Memoize with React `cache()` per request.

### Anti-Pattern 4: Storing Monetary Values as Floats

**What people do:** Use JavaScript `number` / Postgres `FLOAT` for currency amounts.
**Why it's wrong:** `0.1 + 0.2 !== 0.3`. Over many transactions this causes visible rounding errors in totals and charts.
**Do this instead:** Use Postgres `DECIMAL(19,4)` and Prisma's `Decimal` type. Format only at display time.

### Anti-Pattern 5: Household-Unscoped Queries

**What people do:** Query `db.transaction.findMany({ where: { userId } })` — filters by user but forgets householdId.
**Why it's wrong:** A user member of multiple households sees data across them all.
**Do this instead:** Every DAL query includes `householdId` resolved from the verified session. Enforce this in code review and add integration tests that assert cross-household isolation.

---

## Build Order Implications

Components have these dependencies. Build in this sequence:

```
1. Auth + session (Google OAuth, middleware, DAL verifySession)
        ↓
2. Household data model + membership (users can belong to households)
        ↓
3. Categories (needed by transactions)
        ↓
4. Transactions — manual entry (core of the app; everything else reads from this)
        ↓
5. Recurring templates (extends transactions)
        ↓      ↓
6a. Income     6b. Expense views (both read from transactions with type filter)
        ↓
7. Loans (independent of transactions, but needs household model)
        ↓
8. Savings goals (independent; can read transactions for actual vs goal)
        ↓
9. Charts / visualisations (reads all of the above)
        ↓
10. CSV + AI import (reads categories; writes transactions — needs 1-4 done)
        ↓
11. Prediction calculators (reads historical transactions + loans + savings)
```

**Key insight:** Steps 1-4 are blockers for everything else. Ship auth + household + categories + manual transaction entry before building any other feature. The data model established in step 4 is the foundation; changing it later (e.g., adding `isShared`, `importSource`) is possible but costly if done after CSV import is built.

---

## Sources

- [Next.js App Router: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) — official docs, updated 2026-02-16. HIGH confidence.
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) — official docs, updated 2026-02-16. Covers DAL, middleware, Server Actions auth patterns. HIGH confidence.
- [Next.js Architecture in 2026 — Server-First, Client-Islands](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router) — verified against official docs. MEDIUM confidence.
- [Server Actions vs Route Handlers in Next.js](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) — consistent with official Next.js guidance. MEDIUM confidence.
- [Building a Modern Personal Finance Tracker with Next.js, Clerk, and Prisma](https://www.blog.brightcoding.dev/2025/08/11/building-a-modern-personal-finance-tracker-with-next-js-clerk-and-prisma/) — real implementation showing Household model, role-based access, Decimal for money. MEDIUM confidence.

---

*Architecture research for: Personal household finance web app (Next.js App Router)*
*Researched: 2026-02-18*
