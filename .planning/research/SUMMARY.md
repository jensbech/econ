# Project Research Summary

**Project:** econ — Personal Household Finance Web App
**Domain:** Multi-user household finance tracking (NOK, desktop-first)
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a household budgeting app built for a Norwegian audience — multi-user from day one, desktop-first, and NOK-native. The research is clear that the established expert approach is a Next.js 16 App Router monolith with PostgreSQL, where data flows server-first through a Data Access Layer that enforces household-scoped queries before anything reaches the client. The key architectural insight is that "multi-household" is not a feature to add later — it is the load-bearing structure of the entire data model, and every table must carry `household_id` from the first migration.

The recommended stack (Next.js 16 + Drizzle ORM + Neon + Auth.js v5 + shadcn/ui + Tailwind v4) is a well-integrated, greenfield-appropriate combination with high community adoption. The deliberate choice to skip Open Banking / PSD2 sync in favour of CSV import and AI document parsing is the right trade-off: bank integrations in Norway require per-bank maintenance, token refresh handling, and compliance overhead that is out of proportion with the project's scope. Excellent CSV import (handling Norwegian bank format quirks) plus AI-assisted PDF parsing covers the same user need with a fraction of the maintenance burden.

The primary risk category is data integrity and access control. Financial data demands correctness by definition, and three pitfalls — floating-point monetary storage, missing household scoping, and broken access control — must all be resolved in the data model phase or they become extremely expensive to fix retroactively. A secondary risk is scope creep: AI document parsing, prediction calculators, and recurring detection are high-value differentiators, but they are only safe to build after the core data model and manual entry flows are validated.

---

## Key Findings

### Recommended Stack

The core stack is Next.js 16.x (App Router, Turbopack default) with React 19.2, TypeScript 5.1+, and Tailwind CSS v4. Drizzle ORM (v0.45.x) against a Neon-hosted PostgreSQL 17 instance is preferred over Prisma because of Drizzle's serverless performance, smaller bundle, and first-class Neon adapter — Prisma is a reasonable alternative if the team already knows it and accepts its heavier footprint. Auth.js v5 beta handles Google OAuth; it is technically beta but production-grade for App Router projects. Vercel is the deployment target with auto-created preview DB branches per PR.

For UI, shadcn/ui (copy-paste components, Radix primitives, full Tailwind v4 support) covers all needed patterns: DataTable via TanStack Table, Dialog, Sheet, Command palette, and 53 pre-built Recharts-based chart components. React Hook Form + Zod handles forms and server-side validation with a shared schema. The Vercel AI SDK (`ai@6.x`) with `@ai-sdk/google` (Gemini) is the recommended path for PDF/receipt parsing using `generateObject()`. Papaparse handles client-side CSV parsing; UploadThing handles file storage before AI processing.

**Core technologies:**
- **Next.js 16 / React 19.2:** Full-stack framework with App Router — server-first rendering, Server Actions for mutations, Turbopack for builds
- **TypeScript 5.1+:** Non-negotiable for a finance app; type safety across DB schema → API → UI
- **PostgreSQL 17 via Neon:** Relational integrity for hierarchical household→account→transaction data; DECIMAL storage for money; Neon for serverless + Vercel integration
- **Drizzle ORM 0.45.x:** SQL-first, edge-compatible, ~7 KB bundle, no Rust binary; Neon adapter first-class
- **Auth.js v5 beta:** De facto Next.js App Router auth; Google OAuth in ~10 lines; `auth()` works in Server Components, Actions, and Middleware
- **shadcn/ui + Tailwind v4:** Information-dense desktop UI without a vendor lock-in component library; CSS-first Tailwind config
- **Vercel AI SDK + Gemini:** `generateObject()` with Zod schema for structured extraction from bank PDFs; provider-agnostic
- **Zustand 5.x:** UI-only client state (household selection, drawer state); server data stays in Server Components or TanStack Query

### Expected Features

Research across competitor analysis (YNAB, Monarch Money, Copilot) and feature landscape studies converges on a clear MVP set. The differentiating bets for this product are: household-native data model from day one, Norwegian-language defaults (NOK formatting, Norwegian category taxonomy), and AI document parsing as a v1.x add-on — not a table stakes expectation. Competitors universally have poor Nordic support, making NOK-native UX a genuine differentiator at low implementation cost.

**Must have — v1 launch (table stakes):**
- Google OAuth — gating requirement for everything else
- Multi-user household model — two people, shared view, separate logins; must be first-class from day one
- Manual expense and income entry — fast form with smart category suggestions; friction kills habits
- Smart default categories in Norwegian context — mat, transport, bolig, barnehage, helse
- Recurring expense marking — separate `RecurringRule` entity, not a boolean flag
- CSV import with column mapping and duplicate detection
- Monthly dashboard — income vs. expenses, top categories, month navigation
- Charts with drill-down (click segment → transaction list)
- Loan tracking — balance, interest rate, payment, payoff estimate
- Savings goals with progress
- Net worth snapshot (assets minus liabilities)

**Should have — v1.x after validation:**
- AI document parsing (PDF bank statements) — high-value differentiator; build once manual + CSV is established
- Prediction calculators — cash flow forecast, loan payoff scenarios; requires clean recurring + income data first
- Recurring auto-detection — pattern-based suggestion; requires a few months of transaction history
- Search and filter — becomes critical with 3+ months of data
- Data export (CSV + PDF summary)

**Defer — v2+:**
- Mobile-optimized responsive views
- Advanced split costs and per-member budgets
- Notification/reminder system
- Norwegian category taxonomy refinements based on user feedback

**Do not build:**
- Real-time bank sync (Open Banking / PSD2) — wrong trade-off for project scale; Norway's per-bank complexity is severe
- Investment portfolio analytics — different domain; track as balance for net worth only
- Bill payment / money transfer — requires banking license
- AI financial advice — regulated activity in Norway; show trends, never recommend products

### Architecture Approach

The architecture is a server-first Next.js monolith where pages are Server Components that call a mandatory Data Access Layer (DAL). The DAL runs `verifySession()` and resolves `householdId` before every query — this is the security perimeter, not middleware. Middleware does only an optimistic cookie check for redirects. Client Components are islands: charts, interactive tables, and forms receive data as props from Server Components and communicate mutations back through Server Actions. There are no internal API routes for mutations.

**Major components:**
1. **Middleware** — optimistic JWT cookie check only; redirects unauthenticated users; no DB calls
2. **Data Access Layer (`lib/dal/`)** — all DB queries live here; `verifySession()` + household scoping enforced on every function; marked `server-only`
3. **Server Components (`app/(app)/*/page.tsx`)** — fetch data from DAL, compose pages, pass props to Client Islands
4. **Server Actions (`lib/actions/`)** — all mutations (create, update, delete, import); validate with Zod, call DAL, revalidate cache
5. **Client Components (`components/charts/`, `components/tables/`, `components/forms/`)** — interactive UI only; receive data as props; call Server Actions for mutations
6. **AI/parsing service (`lib/ai/`)** — server-only; called from Server Actions; never exposes API keys to client
7. **Auth (Auth.js v5)** — Google OAuth flow, session JWT in HttpOnly cookie, `auth()` helper

**Key data model decisions:**
- All monetary amounts stored as integers in øre (1 NOK = 100 øre) or Postgres `DECIMAL(19,4)` — never float
- `household_id` on every financial entity from the first migration
- `RecurringTemplate` as a separate entity from `Transaction` — projections vs. actuals are distinct
- Loan amortization computed at read time from stored parameters — not stored as rows
- Soft delete on all financial records (`deleted_at`) with `import_batch_id` for reversible bulk imports

### Critical Pitfalls

1. **Broken access control (cross-household data leak)** — The Money Lover finance app shipped this exact bug in production. Prevention: mandatory `assertHouseholdAccess()` pattern in every Server Action; `household_id` in every query; integration tests where User A attempts to access User B's resources by ID. Never trust a client-sent `household_id` — derive it from the session.

2. **Floating-point monetary storage** — `0.1 + 0.2 !== 0.3` in JavaScript/IEEE 754. Store all amounts as integers in øre or Postgres `DECIMAL(19,4)`. Parse on ingestion; format for display only. `FLOAT` columns in a finance DB schema are never acceptable.

3. **Single-user data model with household bolted on later** — Adding household dimension retroactively requires touching every query in the codebase. The `User → HouseholdMembership → Household` hierarchy must exist in the first migration even if only one household is created in MVP.

4. **AI parsing without user confirmation** — LLM extraction has ~3% error rates on clean documents; significantly worse on skewed photos and multi-column Norwegian bank PDFs. Parsed results must be shown to the user for review before any record is saved. No exceptions.

5. **CSV import breaking on Norwegian bank formats** — DNB, Nordea, and Sparebank 1 each use different delimiters (`,` vs `;`), decimal separators (`.` vs `,`), date formats (`dd.mm.yyyy`), and encodings (UTF-8 vs ISO-8859-1). Build format-detection before building the parser. Collect real bank export samples first.

6. **Recurring transactions as repeated records** — `is_recurring: boolean` on the Transaction table is a trap. Without a separate `RecurringRule` entity, editing "all future occurrences" is impossible, and the prediction calculator has no data to work with. Model this correctly in Phase 1.

---

## Implications for Roadmap

Architecture research provides an explicit build order based on component dependencies. Pitfalls research identifies which items must be in Phase 1 or become expensive later. The combined picture suggests five phases:

### Phase 1: Foundation — Auth, Households, Data Model, Core Entry

**Rationale:** Steps 1-4 from the architecture build order are blockers for everything else. Three of the six critical pitfalls must be solved here (float storage, household scoping, access control). The data model established in this phase is the foundation — retroactive changes are costly.

**Delivers:**
- Google OAuth with Auth.js v5 (session cookie, middleware, DAL `verifySession()`)
- `User → HouseholdMembership → Household` data model with role-based access
- Full DAL security layer with household-scoped queries and cross-household access tests
- Manual expense and income entry (fast form, Zod validation, Server Actions)
- Smart Norwegian default categories (mat, transport, bolig, barnehage, helse, etc.)
- Soft delete on all financial records; `import_batch_id` scaffold for future import rollback
- Monetary amounts stored as integers in øre throughout

**Addresses:** Google OAuth, Multi-user households, Manual expense + income entry, NOK-native categories

**Avoids:** Broken access control, Float storage, Missing household dimension (all three must be solved here)

**Research flag:** Standard patterns — well-documented Next.js App Router auth + Drizzle schema patterns. No additional research needed.

---

### Phase 2: Expense Tracking and Recurring Model

**Rationale:** Transactions are the core of the app; everything else (charts, dashboard, predictions) reads from this table. The `RecurringTemplate` entity must be built before prediction calculators, and the N+1 query and query-scoping patterns must be established here before they proliferate.

**Delivers:**
- Full transaction list with sorting, filtering, pagination (shadcn DataTable + TanStack Table)
- `RecurringTemplate` entity separate from `Transaction` — frequency, start/end, series edit
- Recurring expense marking UI (mark transaction, create rule, edit series)
- Category drill-down (click chart segment → filtered transaction list)
- Personal vs. household view toggle (URL param threaded through DAL)
- Composite indexes on `(household_id, date)` for query performance

**Addresses:** Recurring expense marking, Category drill-down, Search and filter scaffold

**Avoids:** Recurring modeled as repeated records (RecurringTemplate built here), N+1 query pitfall

**Research flag:** Standard patterns. No additional research needed.

---

### Phase 3: Dashboard, Loans, Savings, Net Worth

**Rationale:** Once transactions exist, the dashboard and financial tracking views become buildable. Loans and savings are independently modeled (not tied to transaction history) but need the household model from Phase 1. This phase delivers the "why users open the app" view.

**Delivers:**
- Monthly dashboard — income vs. expenses, top categories, month navigation, savings progress widget
- Charts with drill-down (spending by category bar chart, trend line chart, via shadcn Charts / Recharts)
- Loan tracking — balance, interest rate, payment amount, payoff date estimate; amortization computed at read time
- Savings goals with progress bars
- Net worth snapshot — assets minus liabilities; updated on save
- Loan payoff calculator with extra payment scenarios

**Addresses:** Monthly dashboard, Charts, Loan tracking, Savings tracking, Net worth snapshot

**Avoids:** Storing amortization as rows (compute on read), Y-axis chart pitfalls (zero-based by default)

**Research flag:** Loan amortization computation is well-documented math. Chart patterns via shadcn are standard. No additional research needed.

---

### Phase 4: CSV Import and Data Utility

**Rationale:** CSV import unblocks users with existing bank history. It is sequenced here (not earlier) because it depends on categories, the transaction model, and the duplicate detection logic that is only meaningful once manual entry is working. The Norwegian format quirks make this a higher-effort feature than it appears.

**Delivers:**
- CSV import with drag-and-drop (react-dropzone + Papaparse)
- Format detection layer — infer delimiter, decimal separator, date format from file
- Column mapping UI (shadcn dialog + Table)
- Duplicate detection (match on date + amount + description)
- Preview step before any import commits to DB
- Import rollback via `import_batch_id` (soft delete)
- Data export (CSV of transactions, per date range)
- Search and filter (full-text, date range, category, amount range)

**Addresses:** CSV import, Duplicate detection, Data export, Search and filter

**Avoids:** CSV format failures (format-detection layer built here), Import without preview, Missing rollback

**Research flag:** Needs real Norwegian bank CSV samples from DNB, Nordea, and Sparebank 1 before implementation begins. This is the one phase where sample data collection is a prerequisite. Mark for research-phase during planning.

---

### Phase 5: AI Document Parsing and Prediction

**Rationale:** AI document parsing is a differentiator, not a table stake. It is deferred until the core data model and import flows are validated — this ensures the confirmation UX is already established and duplicate detection already exists. Prediction calculators require months of clean recurring + income data to be meaningful; building them last ensures the underlying data is trustworthy.

**Delivers:**
- AI document parsing (PDF bank statements, receipts) via Vercel AI SDK + Gemini `generateObject()`
- File upload to storage via UploadThing → URL passed to AI server action
- Side-by-side review UI (original document + extracted fields) before any save
- Confidence scoring on extracted fields; quarantine for low-confidence results
- Norwegian date format handling (`dd.mm.yyyy`) in parser
- Cash flow prediction (rolling 30-90 days based on recurring items + historical spending rate)
- Loan payoff scenarios with extra payment modeling

**Addresses:** AI document parsing, Prediction calculators

**Avoids:** AI parsing without review (confirmation step is the entire UX premise), Norwegian date format misparse

**Research flag:** AI parsing integration with Vercel AI SDK + Gemini is well-documented for this pattern. The prediction calculator math (cash flow projection) is straightforward but the UX around uncertainty communication deserves design attention. No additional technical research needed; consider a design spike.

---

### Phase Ordering Rationale

- **Security and data model first:** Three of six critical pitfalls (access control, float storage, household scoping) become expensive to fix after Phase 1. There is no safe shortcut.
- **Transactions before everything that reads transactions:** Charts, dashboard, CSV import, and predictions all depend on the transaction model. The architecture build order from research (auth → household → categories → transactions → recurring → everything else) is the correct sequence.
- **CSV before AI parsing:** CSV import establishes the duplicate detection logic and the confirmation-before-commit UX pattern that AI parsing reuses. Building them in this order avoids duplicating the pattern from scratch.
- **Predictions last:** Prediction calculators are only meaningful with months of clean recurring + income data. Building them before data quality is established produces unreliable output that erodes user trust.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (CSV Import):** Requires collecting real Norwegian bank CSV export files from DNB, Nordea, and Sparebank 1 before writing the format-detection layer. Unit tests with synthetic CSV data will not catch the encoding, delimiter, and decimal separator edge cases documented in pitfalls research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js App Router auth + Drizzle schema patterns are well-documented with official sources.
- **Phase 2 (Expense Tracking):** Standard CRUD + TanStack Table patterns.
- **Phase 3 (Dashboard/Loans/Savings):** Recharts via shadcn and amortization math are standard.
- **Phase 5 (AI Parsing):** Vercel AI SDK `generateObject()` + Gemini pattern is well-documented; confirmation UX is a design concern, not a research one.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack verified against official Next.js 16, Drizzle, shadcn, Auth.js v5 docs. Auth.js v5 is @beta on npm but production-grade. AI SDK version compatibility (ai@6.x + @ai-sdk/google@3.x) should be verified at install time. |
| Features | MEDIUM | Competitor feature analysis is solid (established reviewers, official product pages). Norwegian market preferences are LOW confidence — no local user research data available. Norwegian default category taxonomy should be validated with real users early. |
| Architecture | HIGH | Primary sources are official Next.js docs updated 2026-02-16. DAL pattern, Server Actions, and middleware security posture are explicitly recommended by Next.js team. CVE-2025-29927 (middleware bypass) is documented. |
| Pitfalls | MEDIUM | Access control and float storage pitfalls are well-sourced (production incidents, official OWASP, Modern Treasury). CSV format edge cases are based on Norwegian bank format knowledge — verified by documentation but not by running a parser against real files. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Norwegian category taxonomy:** Research identified that Norwegian-specific categories (barnehage, hytte, etc.) are a differentiator, but there is no user research data on what a Norwegian household actually wants. Propose a sensible default set and build an edit/rename UI from day one so it can be corrected without a code change.
- **Auth.js v5 beta stability:** Auth.js v5 is widely used in production with Next.js 15/16 but remains @beta on npm as of Feb 2026. If stability is a concern, Clerk is a documented alternative with better DX and a free tier (10,000 MAUs). Decide before Phase 1 begins.
- **AI provider cost model:** Using Gemini for PDF parsing will incur per-request costs. For a personal household app with low volume this is negligible, but the cost model should be checked if the app is ever shared beyond one household.
- **Real Norwegian bank CSV samples:** Phase 4 cannot be implemented safely without real export files from DNB, Nordea, and Sparebank 1. These should be collected before Phase 4 planning begins.
- **Soft delete UI:** Research strongly recommends soft delete for all financial records, but no research was done on the user-facing undo/history experience. This is a UX design gap to address during Phase 1 planning.

---

## Sources

### Primary (HIGH confidence)
- [Next.js App Router Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) — official docs, 2026-02-16
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) — DAL, middleware, Server Actions patterns; 2026-02-16
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — version requirements, Turbopack stable, React 19.2
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 + React 19 compatibility confirmed
- [shadcn/ui Charts](https://ui.shadcn.com/charts) — 53 chart components, Recharts-based
- [Monarch Money features](https://www.monarch.com/features/tracking) — official competitor feature page
- [NerdWallet Best Budget Apps 2026](https://www.nerdwallet.com/finance/learn/best-budget-apps) — feature landscape

### Secondary (MEDIUM confidence)
- [Drizzle vs Prisma 2025 — Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/) — bundle size, serverless performance
- [Neon vs Supabase — Design Revision](https://designrevision.com/blog/supabase-vs-neon) — Neon Vercel integration
- [Next.js Architecture 2026 — yogijs.tech](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router) — server-first client-islands pattern
- [Modern Treasury — Floats Don't Work for Cents](https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents) — float storage pitfall
- [Dark Reading — Money Lover Data Exposure](https://www.darkreading.com/application-security/-money-lover-finance-app-exposes-user-data) — access control production incident
- [Vercel — Common Mistakes with Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) — App Router pitfalls
- [Flatfile — 6 Common CSV Import Errors](https://flatfile.com/blog/top-6-csv-import-errors-and-how-to-fix-them/) — CSV format edge cases

### Tertiary (LOW confidence)
- [Financial Panther — Key Features 2026](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/) — feature landscape; single source
- [Blue Train — What Users Want in a Finance App](https://www.bluetrain.co.uk/blog/what-users-want-in-a-personal-finance-app-key-features-marketing-insights/) — UX preferences; single source
- Norwegian market feature preferences — no local user research available; inferred from competitor gap analysis

---

*Research completed: 2026-02-18*
*Ready for roadmap: yes*
