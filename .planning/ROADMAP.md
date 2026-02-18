# Roadmap: Household Economy

## Overview

Starting from nothing, this roadmap builds a household finance application in five phases. Phase 1 lays the non-negotiable security and data model foundations — auth, household scoping, and correct monetary storage — that become expensive to retrofit later. Phase 2 delivers complete expense and income tracking with recurring rules as a first-class entity. Phase 3 adds the dashboard, charts, loans, savings, and the loan calculator — the views users open the app to see every day. Phase 4 handles CSV import with Norwegian bank format detection, unlocking existing transaction history. Phase 5 adds AI document parsing from PDFs and receipts. Each phase delivers a coherent, verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, data model, household scoping, and app scaffold with correct monetary storage
- [ ] **Phase 2: Expense and Income Tracking** - Complete manual entry flows for expenses, income, and recurring rules
- [ ] **Phase 3: Dashboard, Charts, Loans, and Savings** - The views users open the app to see every day
- [ ] **Phase 4: CSV Import** - Norwegian bank CSV import with format detection, duplicate checking, and preview
- [ ] **Phase 5: AI Document Parsing** - Upload PDFs and receipt images; AI extracts and user reviews before saving

## Phase Details

### Phase 1: Foundation
**Goal**: Users can sign in, the app is secured, and the data model is correct from the start
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, GUIX-01, GUIX-02, GUIX-04
**Success Criteria** (what must be TRUE):
  1. User can sign in with their Google account and land on a protected page
  2. User remains signed in after closing and reopening the browser tab
  3. User can sign out from any page and is redirected to the sign-in screen
  4. All monetary amounts displayed anywhere in the app show in Norwegian format (123 456,78 kr)
  5. The app has a clear page layout with navigation between pages and a desktop-first, information-dense design
**Plans**: TBD

Plans:
- [ ] 01-01: Project scaffold — Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Drizzle + Neon setup
- [ ] 01-02: Database schema — household model, monetary storage in øre, soft delete, import batch scaffold
- [ ] 01-03: Auth — Google OAuth via Auth.js v5, session cookie, DAL verifySession, middleware
- [ ] 01-04: App shell — navigation, layout, NOK formatting utility, page structure

### Phase 2: Expense and Income Tracking
**Goal**: Users can record every expense and income entry they have, including recurring ones, and see a filtered list of what they've entered
**Depends on**: Phase 1
**Requirements**: EXPN-01, EXPN-02, EXPN-03, EXPN-04, EXPN-05, EXPN-06, RECR-01, RECR-02, RECR-03, RECR-04, INCM-01, INCM-02, INCM-03, GUIX-03
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and soft-delete an expense with date, amount, category, and optional notes
  2. User can filter the expense list by month, category, or date range and see matching records
  3. User can define a recurring expense rule and see it auto-populate for the current and future months
  4. User can edit a single occurrence of a recurring expense without affecting the rule, or edit the rule to change all future occurrences
  5. User can record a salary or variable income entry and view income filtered by month and by year
  6. User can click any data summary to drill down into a detailed transaction table
**Plans**: TBD

Plans:
- [ ] 02-01: Categories — smart Norwegian defaults (mat, transport, bolig, etc.), create/rename/delete custom categories
- [ ] 02-02: Expense entry — create/edit/delete form, Zod validation, Server Actions, soft delete
- [ ] 02-03: Expense list — filterable/sortable DataTable (month, category, date range), drill-down
- [ ] 02-04: Recurring rules — RecurringTemplate entity, auto-population, single-occurrence edit, series edit
- [ ] 02-05: Income tracking — entry form, recurring salary rule, monthly and yearly views

### Phase 3: Dashboard, Charts, Loans, and Savings
**Goal**: Users can see where their money is going and track the state of their loans and savings goals
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, CHRT-01, CHRT-02, CHRT-03, CHRT-04, LOAN-01, LOAN-02, LOAN-03, LOAN-04, SAVG-01, SAVG-02, SAVG-03, CALC-01, CALC-02
**Success Criteria** (what must be TRUE):
  1. Dashboard shows total income, total expenses, and savings rate for the selected month, and user can navigate between months
  2. User can see spending broken down by category as a chart, and click any category to drill into the matching transactions
  3. User can add a loan, record payments, and see the current estimated balance, remaining term, and payment history
  4. User can create a savings goal with a target amount, record progress, and see how close they are as an amount and percentage
  5. User can enter a loan balance, interest rate, and monthly payment into the loan calculator and see the estimated payoff date and total interest; adjusting the payment amount updates the result
**Plans**: TBD

Plans:
- [ ] 03-01: Dashboard page — monthly snapshot, category totals, upcoming recurring, month navigation
- [ ] 03-02: Charts — spending by category (bar/pie), spending trend (line/area), income vs expenses; click-to-drill-down
- [ ] 03-03: Loan tracking — add loan, record payments, amortization computed at read time, payment history
- [ ] 03-04: Savings goals — create goal, update saved amount, progress bar
- [ ] 03-05: Loan payoff calculator — parameterised inputs, payoff date, total interest, payment slider

### Phase 4: CSV Import
**Goal**: Users can upload a bank CSV export and have its transactions imported with full control over the result
**Depends on**: Phase 3
**Requirements**: IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05
**Success Criteria** (what must be TRUE):
  1. User can upload a CSV file exported from a Norwegian bank (DNB, Nordea, or Sparebank 1) and the app correctly detects the delimiter, decimal separator, and date format without manual configuration
  2. User can map CSV columns to transaction fields (date, amount, description, category) before committing the import
  3. App flags any rows that appear to be duplicates of existing transactions before the user confirms
  4. User sees a preview of all parsed transactions and can review them before any record is saved to the database
**Plans**: TBD

Plans:
- [ ] 04-01: CSV format detection — delimiter, decimal separator, date format, encoding (UTF-8 / ISO-8859-1)
- [ ] 04-02: Column mapping UI — dialog to map CSV columns to transaction fields
- [ ] 04-03: Duplicate detection — match on date + amount + description before commit
- [ ] 04-04: Import preview and confirmation — preview table, confirm/cancel, rollback via import_batch_id

### Phase 5: AI Document Parsing
**Goal**: Users can upload a PDF bank statement or receipt image and have transactions extracted, reviewed, and saved with minimal manual effort
**Depends on**: Phase 4
**Requirements**: AIDP-01, AIDP-02, AIDP-03, AIDP-04
**Success Criteria** (what must be TRUE):
  1. User can upload a PDF bank statement or receipt image from the import page
  2. The app extracts date, amount, description, and category for each transaction using AI and presents them to the user
  3. User reviews extracted transactions side-by-side with the original document before any record is saved
  4. User can correct any extracted field inline before confirming; corrected records save cleanly to the database
**Plans**: TBD

Plans:
- [ ] 05-01: File upload — drag-and-drop, file storage via UploadThing, server action pipeline
- [ ] 05-02: AI extraction — Vercel AI SDK + Gemini generateObject(), Zod schema, Norwegian date handling
- [ ] 05-03: Review UI — side-by-side original + extracted fields, editable fields, confidence indicators, confirm/discard

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Not started | - |
| 2. Expense and Income Tracking | 0/5 | Not started | - |
| 3. Dashboard, Charts, Loans, and Savings | 0/5 | Not started | - |
| 4. CSV Import | 0/4 | Not started | - |
| 5. AI Document Parsing | 0/3 | Not started | - |
