# PRD: Jeg vil ha pengene mine!

A personal household finance application for tracking income, expenses, savings, and loans.
Desktop-first, information-dense, NOK only. Built with Next.js 16 App Router.

---

## Project Context

**App name:** Jeg vil ha pengene mine!
**Currency:** NOK only — store all monetary amounts as integers in øre (1 NOK = 100 øre)
**Platform:** Desktop-first; responsive is nice-to-have, not required
**Design direction:** Light & airy, white/light-gray backgrounds, blue/indigo accent. Green = income, red = expenses. Dark mode supported.
**Sign-in page:** Centered card — app name, tagline, Google sign-in button. After sign-in → dashboard.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5.1+
- **Styling:** Tailwind CSS v4 (CSS-first config, no tailwind.config.js)
- **UI components:** shadcn/ui (Radix primitives, Tailwind v4 compatible)
- **Database:** PostgreSQL via Neon (serverless driver `@neondatabase/serverless`)
- **ORM:** Drizzle ORM 0.45.x + Drizzle Kit
- **Auth:** Auth.js v5 beta (`next-auth@beta`) — Google OAuth only
- **Forms:** React Hook Form 7.x + Zod 3.x + `@hookform/resolvers`
- **Charts:** shadcn/ui Charts (Recharts wrapper — use shadcn components, not Recharts directly)
- **Tables:** TanStack Table via shadcn DataTable
- **Date utils:** date-fns 3.x with `nb` (Norwegian Bokmål) locale
- **Client state:** Zustand 5.x (UI state only, not server data)
- **AI parsing:** Vercel AI SDK 6.x (`ai`) + `@ai-sdk/google` (Gemini)
- **File uploads:** UploadThing 7.x + react-dropzone
- **CSV parsing:** Papaparse 5.x
- **Linting:** Biome (replaces ESLint + Prettier)
- **Deployment:** Vercel

**NOK formatting:** `Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' })`
**Date locale:** `import { nb } from 'date-fns/locale'`

---

## Tasks

Work through tasks in order. Each task = one commit. Do not skip ahead.

### Phase 1 — Foundation

- [ ] **TASK-01** — Project scaffold: Run `npx create-next-app@latest econ --typescript --tailwind --app --turbopack`. Install all dependencies: `next-auth@beta`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `zustand`, `papaparse`, `react-dropzone`, `@biomejs/biome`. Init shadcn/ui. Init Biome. Set up `.env.local` template (with placeholder values for `DATABASE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`). Verify `npm run dev` starts without errors.

- [ ] **TASK-02** — Database schema: Define Drizzle schema in `src/db/schema.ts`. Tables: `users` (id, email, name, image, createdAt), `households` (id, name, createdAt), `household_members` (householdId, userId, role), `categories` (id, householdId, name, type: income|expense, isDefault, createdAt, deletedAt), `expenses` (id, householdId, userId, categoryId, amountOere, date, notes, recurringTemplateId, importBatchId, createdAt, deletedAt), `recurring_templates` (id, householdId, userId, categoryId, amountOere, frequency: weekly|monthly|annual, startDate, endDate, type: expense|income, description, createdAt, deletedAt), `income_entries` (id, householdId, userId, categoryId, amountOere, date, source, type: salary|variable, recurringTemplateId, createdAt, deletedAt), `loans` (id, householdId, userId, name, type: mortgage|student, principalOere, interestRate, termMonths, startDate, createdAt, deletedAt), `loan_payments` (id, loanId, amountOere, date, createdAt), `savings_goals` (id, householdId, userId, name, targetOere, currentOere, targetDate, createdAt, deletedAt), `import_batches` (id, householdId, userId, filename, rowCount, createdAt, rolledBackAt). Run `drizzle-kit generate` to produce initial migration.

- [ ] **TASK-03** — Auth: Configure Auth.js v5 in `src/auth.ts` with Google provider. Add `middleware.ts` to protect all routes except `/` (sign-in). Create `src/lib/dal.ts` with `verifySession()` that calls `auth()` and returns the user or throws if unauthenticated. Create the sign-in page at `app/page.tsx` — centered card with app name "Jeg vil ha pengene mine!", tagline, and Google sign-in button. After sign-in, redirect to `/dashboard`. After sign-out, redirect to `/`. Verify the full auth flow works end-to-end.

- [ ] **TASK-04** — App shell: Create `src/lib/format.ts` with `formatNOK(oere: number): string` using `Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' })` (convert øre → NOK before formatting). Create the authenticated layout in `app/(app)/layout.tsx` with navigation sidebar or top nav (your choice of pattern) linking to: Dashboard, Expenses, Income, Loans, Savings, Import. Add a user avatar/sign-out control. Create empty placeholder pages for each section. Verify navigation works and NOK formatter is importable from any page.

---

### Phase 2 — Expense and Income Tracking

- [ ] **TASK-05** — Default categories: Create a `src/lib/default-categories.ts` file with Norwegian default expense categories: Mat & dagligvarer, Transport, Bolig, Helse & apotek, Klær & sko, Underholdning, Restaurant & kafé, Abonnementer, Reise, Barn, Sparing, Annet. And income categories: Lønn, Variabel inntekt, Annet. Write a `seedDefaultCategories(householdId)` server function that inserts these with `isDefault: true` if they don't exist. Trigger seeding on first sign-in (after auth). Add category CRUD: a `/settings/categories` page with a list, add form, rename inline, and delete (soft delete with confirmation).

- [ ] **TASK-06** — Expense entry form: Create `/expenses/new` and `/expenses/[id]/edit` pages. Form fields: date (date picker), amount (NOK, converted to øre on save), category (select from household categories), notes (optional textarea). Validate with Zod. Submit via Server Action. On save, redirect to expense list. Add delete button on edit page (soft delete with confirmation dialog). All monetary inputs must be in NOK (not øre) — convert on the server side before storing.

- [ ] **TASK-07** — Expense list page: At `/expenses`, render a shadcn DataTable of expenses (using TanStack Table). Columns: date, description/notes, category, amount (formatted in NOK). Add filter controls: month picker, category select, date range. Support sorting by date and amount. Each row has edit and delete actions. Show total for the current filter at the bottom. Include a drill-down detail sheet (shadcn Sheet) that opens when clicking a row.

- [ ] **TASK-08** — Recurring expense rules: Add a `RecurringTemplate` management UI at `/expenses/recurring`. Users can create a rule (description, amount, category, frequency: weekly|monthly|annual, start date). Implement a server function `expandRecurringExpenses(householdId, month: Date)` that generates `expenses` rows from active templates for the given month if they don't already exist. Call this function when the expense list page loads for any given month. Allow editing a single occurrence (unlinks from template) vs editing the rule (updates all future occurrences — set a new start date on the template and soft-delete old future generated entries).

- [ ] **TASK-09** — Income tracking: Create `/income` page with the same DataTable pattern as expenses. Add `/income/new` and `/income/[id]/edit` pages. Form fields: date, amount (NOK), source label, type (salary | variable), category. Monthly and yearly view toggle. Show totals per view. Support recurring salary income using the same `RecurringTemplate` mechanism (type: income). Show income total for selected period.

---

### Phase 3 — Dashboard, Charts, Loans, and Savings

- [ ] **TASK-10** — Dashboard page: At `/dashboard`, show a monthly snapshot for the current month (navigable with prev/next month arrows): total income, total expenses, savings rate ((income - expenses) / income × 100, shown as a percentage). Below that, show spending by category as a summary list with amounts. Show upcoming recurring expenses for the month. All amounts in NOK format. Empty state when no data exists.

- [ ] **TASK-11** — Charts: Add a `/charts` page (or chart sections within dashboard). Implement using shadcn/ui Charts (Recharts wrapper): (1) spending by category as a bar chart and pie chart with toggle; (2) spending trend over the last 6 months as a line/area chart; (3) income vs expenses comparison bar chart per month. Each chart element is clickable — clicking a bar/slice navigates to the expense list filtered to that category and month (pass filter via URL search params).

- [ ] **TASK-12** — Loan tracking: Create `/loans` page listing all loans with current estimated balance and remaining term. Add `/loans/new` page: form for loan name, type (mortgage | student), principal (NOK), annual interest rate (%), term in months, start date. Compute current balance at read time using amortization math (do not store it — derive it from principal, rate, term, start date, and recorded payments). Add a payment recorder (date + amount) per loan. Show payment history table per loan. Soft delete loans.

- [ ] **TASK-13** — Savings goals: Create `/savings` page. Each goal shows: name, target amount (NOK), current saved amount (NOK), progress bar (percentage), and optional target date. Add `/savings/new` form: name, target amount, optional target date. Add "Update progress" action — a quick form to set or increment the current saved amount. Show a summary of total saved vs total target across all goals.

- [ ] **TASK-14** — Loan payoff calculator: Add a `/calculator` page. Two panels: (1) Loan payoff: inputs for remaining balance (NOK), annual interest rate (%), monthly payment (NOK). Output: payoff date, number of months, total interest paid. Adjusting monthly payment via a slider updates outputs instantly (client-side calculation, no server call). (2) Savings projector: inputs for initial amount (NOK), monthly contribution (NOK), annual return (%). Output: projected value at 5y/10y/20y/30y marks. All calculations client-side with React state.

---

### Phase 4 — CSV Import

- [ ] **TASK-15** — CSV format detection: Create `src/lib/csv-detect.ts`. Given a raw CSV string, detect: delimiter (`,` vs `;` vs `\t`), decimal separator (`.` vs `,`), date format (dd.mm.yyyy vs yyyy-mm-dd), and encoding assumption (UTF-8 / ISO-8859-1 instruction for the upload). Test against sample rows from DNB, Nordea, and Sparebank 1 export formats (research the column layouts). Return a detection result object with confidence flag.

- [ ] **TASK-16** — Column mapping UI: On the `/import` page, after a CSV is dropped/selected (use react-dropzone + Papaparse for client-side parsing), show a mapping dialog (shadcn Dialog). Display detected delimiter/format. For each required field (date, amount, description), show a dropdown of detected CSV column headers. Pre-fill with best-guess column matches. User confirms mapping before proceeding.

- [ ] **TASK-17** — Duplicate detection: Before committing import, run a duplicate check. For each parsed transaction, query existing expenses where date = transaction.date AND amountOere = transaction.amountOere AND notes ILIKE transaction.description. Flag matches as probable duplicates. Show them highlighted in the preview table with a "skip duplicate" checkbox pre-checked.

- [ ] **TASK-18** — Import preview and confirmation: Show a full preview table of all parsed + mapped transactions before any DB write. Each row shows: date, amount (NOK), description, detected category (best-guess from description keywords), duplicate flag. User can edit category per row inline. "Confirm import" button creates an `import_batch` record, bulk-inserts all non-skipped rows linked to that batch ID. "Cancel" discards everything. Add a "rollback import" action that soft-deletes all expenses with a given `importBatchId`.

---

### Phase 5 — AI Document Parsing

- [ ] **TASK-19** — File upload pipeline: Extend `/import` to accept PDF and image uploads (JPG, PNG, WEBP) in addition to CSV. Use UploadThing's FileRouter to handle storage — configure routes for `receipt` (images up to 4 MB) and `statement` (PDFs up to 16 MB). On successful upload, UploadThing returns the file URL. Pass this URL to the AI extraction server action. Show upload progress indicator.

- [ ] **TASK-20** — AI extraction: Create a `src/lib/ai-extract.ts` server function. Use Vercel AI SDK `generateObject()` with `@ai-sdk/google` (Gemini 1.5 Flash). Define a Zod schema for extracted output: array of `{ date: string, amountOere: number, description: string, suggestedCategory: string, confidence: 'high' | 'medium' | 'low' }`. Prompt the model to extract all transactions from the document, parse Norwegian date formats (dd.mm.yyyy), convert amounts to øre (integers). Handle errors gracefully — if extraction fails, return an error state the UI can display.

- [ ] **TASK-21** — AI review UI: After AI extraction, show a side-by-side review page: original document (PDF iframe or image) on the left, extracted transactions table on the right. Each row is fully editable inline (date, amount, category, description). Confidence indicators shown as colored dots (green/yellow/red). Low-confidence rows are highlighted. "Confirm" saves all visible rows (non-deleted) using the same import batch mechanism as CSV import. "Discard all" cancels without saving. Individual rows can be deleted from the list before confirming.
