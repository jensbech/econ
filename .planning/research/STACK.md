# Stack Research

**Domain:** Personal Household Finance Web App
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH (core stack HIGH, AI/parsing tooling MEDIUM)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x (latest: 16.1.6) | Full-stack React framework | App Router is mature, Turbopack now default bundler (2-5x faster builds), React 19.2 support. Released Oct 2025. Greenfield projects should start here, not 15.x. |
| React | 19.2 | UI runtime | Bundled with Next.js 16. View Transitions, `useEffectEvent`, `<Activity/>` all stable. Required for Next.js 16. |
| TypeScript | 5.1+ | Type safety | Minimum requirement for Next.js 16. Finance apps need type safety across DB schema ↔ API ↔ UI. Non-negotiable. |
| Tailwind CSS | 4.x | Utility-first styling | CSS-first config (no `tailwind.config.js`), OKLCH color system, better performance. shadcn/ui fully supports v4. Greenfield: use v4 directly. |
| shadcn/ui | Latest (Feb 2026) | Composable component library | Copy-paste components (no version lock-in). Built on Radix UI primitives. Full Tailwind v4 + React 19 support. Best choice for information-dense desktop UI: ships DataTable (TanStack Table), Dialog, Sheet, Command palette, Form, etc. |

### Database

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PostgreSQL | 17.x | Relational database | Finance data is highly relational (households → users → accounts → transactions → categories). JSONB for flexible metadata. ACID transactions for money operations. |
| Neon | Serverless tier | Managed PostgreSQL hosting | Native Vercel integration. Serverless driver optimized for Next.js Server Actions and Route Handlers. Instant branching for dev/preview environments. Free tier: 500 MB. Better fit than Supabase for a Next.js-first stack that doesn't need Supabase's auth/storage/realtime. |
| Drizzle ORM | 0.45.x stable (v1.0 beta also available) | TypeScript ORM | SQL-first API: schema defined in TypeScript, generates migrations via Drizzle Kit. No Rust binary (Prisma problem). Bundle ~7.4 KB. Neon's serverless adapter is first-class. Edge-compatible. Prefer over Prisma for Next.js serverless deployments. |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (next-auth) | 5.x beta (install: `next-auth@beta`) | Authentication | The de facto standard for Next.js OAuth. v5 is a complete rewrite for App Router: `auth()` helper works in Server Components, Server Actions, Route Handlers, and Middleware. Google OAuth setup is 10 lines. Still technically beta but widely used in production with Next.js 15/16. No compelling alternative at this maturity level. |

### Infrastructure / Hosting

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel | — | Deployment platform | Designed for Next.js. Preview deployments per PR. First-class Neon integration (auto-creates preview DB branches). Zero-config CI/CD. For a personal finance app, the free/hobby tier is sufficient. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Charts (Recharts) | Built into shadcn | Financial charts: line, area, bar, pie | Use for all charts/graphs. shadcn wraps Recharts with Tailwind CSS variables and dark mode support. No separate chart library needed — 53 pre-built chart components. Use for: monthly spending trends, savings progress, loan amortization curves. |
| TanStack Table | 8.x | Headless data table | Already included via shadcn DataTable component. Use for transaction tables with sorting, filtering, pagination. Required for information-dense views. |
| React Hook Form | 7.x | Form state management | Minimal re-renders, uncontrolled inputs. Use for all forms: expense entry, loan setup, income tracking. |
| Zod | 3.x | Schema validation | Used on both client (React Hook Form resolver) and server (Server Action validation). Define schema once, use everywhere. Critical for money inputs. |
| @hookform/resolvers | 3.x | RHF + Zod bridge | Connects React Hook Form to Zod schemas. Always install with both. |
| Vercel AI SDK | 6.x (ai@6.x) | AI document parsing | Use `generateObject()` with Zod schema to extract structured expense data from uploaded receipts/PDFs. Works with OpenAI, Anthropic, Google. Provider-agnostic. |
| @ai-sdk/openai or @ai-sdk/google | 3.x | AI provider | Use Google Gemini (via `@ai-sdk/google`) for PDF/image processing — Gemini's multimodal capabilities are strong for receipt parsing. Fallback: OpenAI GPT-4o. |
| Papaparse | 5.x | CSV parsing | Browser-side CSV parsing for expense import. Fast, well-maintained, no server round-trip needed for column mapping. |
| react-dropzone | 14.x | File upload UX | Drag-and-drop file upload component. Use for CSV and PDF upload flows. |
| UploadThing | 7.x | File upload to storage | Handles file storage for receipts/PDFs before AI parsing. Next.js-native, type-safe FileRouter API. Stores files in CDN, returns URL for subsequent AI processing. |
| date-fns | 3.x | Date manipulation | NOK locale, fiscal year calculations, loan amortization date math. Prefer over dayjs for TypeScript-first tree-shaking. |
| Zustand | 5.x | Client state management | Use for UI state only (current household selection, filter state, drawer open/close). Do NOT use for server data — that's TanStack Query's job. Minimal, no boilerplate. |
| TanStack Query | 5.x | Server state / caching | Use for data that needs client-side caching and refetching (charts, transaction lists). Pairs with Next.js Server Actions via mutation pattern. Optional — most data can be fetched in Server Components. Add when you need optimistic updates or polling. |
| Recharts | 2.x | Underlying chart engine | Already bundled via shadcn Charts. Do not import directly — use shadcn's chart wrapper components. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Drizzle Kit | Database migrations and schema push | Use `drizzle-kit generate` + `drizzle-kit migrate`. Use `drizzle-kit push` for dev iteration against Neon branch. |
| Biome | Linting and formatting | Next.js 16 removed `next lint` command. Biome is the recommended replacement: faster than ESLint + Prettier, single binary, zero config. |
| Turbopack | Bundler (default in Next.js 16) | No action needed — default. Disable with `--webpack` only if you have a Babel plugin that Turbopack doesn't support. |

---

## Installation

```bash
# Create project
npx create-next-app@latest econ --typescript --tailwind --app --turbopack

# Core auth
npm install next-auth@beta

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# UI components
npx shadcn@latest init
npx shadcn@latest add button card dialog form input label select table sheet command

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# AI document parsing
npm install ai @ai-sdk/google
# or OpenAI: npm install @ai-sdk/openai

# File upload
npm install uploadthing @uploadthing/react

# CSV parsing
npm install papaparse react-dropzone
npm install -D @types/papaparse

# Date utilities
npm install date-fns

# Client state
npm install zustand

# Dev tools
npm install -D @biomejs/biome
npx @biomejs/biome init
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Drizzle ORM | Prisma 7.x | Prisma 7 finally pure TypeScript (no Rust binary), but still heavier. Choose Prisma if team is already fluent and you prioritize its Studio GUI and richer relation API. |
| Neon | Supabase | Supabase if you also want its auth, storage, realtime subscriptions, and edge functions as a bundled BaaS. For this project, Auth.js handles auth — Supabase's value-add is reduced. |
| Auth.js v5 beta | Clerk | Clerk if DX and time-to-ship matter more than control and cost. Clerk has a free tier (10,000 MAUs) and significantly better UI components for auth flows. If Google OAuth feels daunting with Auth.js, use Clerk. |
| shadcn/ui Charts (Recharts) | Chart.js / ECharts | ECharts for complex financial visualizations (candlestick, heatmap). Recharts sufficient for this app's needs (line, area, bar, pie). ECharts would be overkill. |
| Tailwind CSS v4 | Tailwind CSS v3 | If migrating an existing app with heavy v3 customization. Greenfield: always use v4. |
| Vercel AI SDK | LangChain | LangChain for complex RAG/agent pipelines. Vercel AI SDK is simpler and sufficient for single-step document extraction. |
| Papaparse | csv-parser (Node.js) | csv-parser for server-side streaming of very large CSVs. For household finance CSVs (hundreds of rows), browser-side Papaparse is simpler. |
| Biome | ESLint + Prettier | ESLint if you have existing rules/plugins not supported by Biome. Biome supports 90%+ of common ESLint rules and is dramatically faster. |
| date-fns | Temporal API | Temporal when it reaches broad browser support (~2027). Use date-fns now. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Redux / Redux Toolkit | Massive boilerplate for this app's scale. Server state belongs in TanStack Query or Server Components; UI state belongs in Zustand. | Zustand + TanStack Query |
| next-auth v4 (stable) | Designed for Pages Router. App Router support is bolted on. v5 is the correct choice for App Router projects. | next-auth@beta (v5) |
| Pages Router | Deprecated direction. New Next.js projects must use App Router. | App Router |
| Prisma before v7 | Rust binary causes cold start issues on serverless. If using Prisma, use v7+ which is pure TypeScript. | Drizzle ORM |
| Moment.js | Unmaintained, massive bundle (66 KB gzipped). | date-fns or Temporal |
| Axios | `fetch()` is built-in and works in Server Components. Axios adds bundle weight with no benefit in Next.js. | Native fetch / TanStack Query |
| React-CSV-Importer (react-csv-importer-next) | Outdated, maintenance uncertain. | Papaparse + custom shadcn dialog |
| Tremor | Uses Recharts internally but adds another abstraction layer. shadcn Charts achieves the same with less overhead. | shadcn/ui Charts |
| `getServerSideProps` / `getStaticProps` | Pages Router patterns — do not exist in App Router. | async Server Components + `fetch()` |
| Mongoose / MongoDB | Finance data is highly relational. SQL enforces referential integrity for household → user → account → transaction chains. | PostgreSQL + Drizzle |

---

## Stack Patterns by Variant

**For expense/income data fetching (read-heavy, SEO-irrelevant):**
- Fetch in async Server Components (no client state needed)
- Use TanStack Query only when you need client-side optimistic updates (e.g., inline edit)

**For AI document parsing flow:**
- User uploads PDF/image → UploadThing stores it → returns URL
- Server Action calls Vercel AI SDK `generateObject()` with the URL + Zod schema
- Extracted data populates a shadcn/ui form for user review before save
- Use `@ai-sdk/google` (Gemini 1.5 Pro/Flash) — best multimodal performance for receipts

**For CSV import flow:**
- User drops file → Papaparse parses client-side → column mapping UI (shadcn dialog + Table)
- Server Action validates with Zod, bulk inserts via Drizzle

**For multi-user households:**
- Household entity with many-to-many user membership in PostgreSQL
- Auth.js session stores `userId`; every query filters by `householdId` from the user's membership
- Drizzle's `with` (eager loading) for household → accounts → transactions

**For NOK currency display:**
- Use `Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' })`
- Store all amounts as integers in øre (1 NOK = 100 øre) to avoid floating-point errors
- date-fns locale: `nb` (Norwegian Bokmål)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.x | react@19.2, react-dom@19.2 | React 19.2 required. Do not mix with React 18. |
| next-auth@beta (v5) | next@14+, next@15, next@16 | Works with Next.js 16. Still @beta on npm as of Feb 2026. |
| drizzle-orm@0.45.x | @neondatabase/serverless@0.10+ | Use Neon's `neonConfig.webSocketConstructor` for serverless environments. |
| tailwindcss@4.x | shadcn/ui (Feb 2026+) | All shadcn components updated for Tailwind v4. CSS-first config required. |
| ai@6.x | @ai-sdk/google@3.x, @ai-sdk/openai@3.x | Provider packages must match SDK major version. Check `@ai-sdk/*` peer deps. |
| react-hook-form@7.x | zod@3.x + @hookform/resolvers@3.x | All three must be installed together. |

---

## Sources

- [Next.js 16 official release blog](https://nextjs.org/blog/next-16) — verified: release date Oct 21 2025, version requirements, Turbopack stable, React 19.2. HIGH confidence.
- [Next.js 16.1 release](https://nextjs.org/blog/next-16-1) — Turbopack file system caching stable. HIGH confidence.
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) — App Router support, configuration changes. MEDIUM confidence (still @beta).
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) — latest stable 0.45.1, v1.0.0-beta.2 also available. HIGH confidence.
- [Vercel AI SDK](https://ai-sdk.dev) — ai@6.x current, `generateObject()` for structured extraction. HIGH confidence.
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — full Tailwind v4 + React 19 compatibility confirmed. HIGH confidence.
- [shadcn/ui Charts](https://ui.shadcn.com/charts) — 53 chart components, Recharts-based, Tailwind CSS variables. HIGH confidence.
- [Neon vs Supabase comparison](https://designrevision.com/blog/supabase-vs-neon) — Neon native Vercel integration, serverless driver. MEDIUM confidence.
- [Drizzle vs Prisma 2025](https://www.bytebase.com/blog/drizzle-vs-prisma/) — bundle size, serverless performance, SQL-first approach. MEDIUM confidence.
- WebSearch: Next.js standard stack patterns, Auth.js v5 usage, Papaparse + react-dropzone patterns — MEDIUM confidence (multiple consistent sources).

---

*Stack research for: Personal Household Finance Web App (Next.js)*
*Researched: 2026-02-18*
