# Household Economy

## What This Is

A personal household finance application for managing income, expenses, savings, and loans across multiple household members. Built with Next.js and backed by a database, it provides a desktop-first, information-dense experience where focused pages each handle one aspect of household finances, coming together to paint the full financial picture. Users authenticate via Google and can upload receipts/statements for AI-powered automatic categorization.

## Core Value

Give our household a clear, always-current view of where money comes from, where it goes, and how our financial position is trending — so we can make informed decisions about spending, saving, and debt repayment.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Google OAuth authentication with household membership
- [ ] Multi-user household with personal + shared views
- [ ] Dashboard with monthly snapshot (spending totals, income, savings rate)
- [ ] Expense entry — manual, CSV/file import, and AI-powered document parsing (images/PDFs)
- [ ] Smart default categories for expenses, fully customizable
- [ ] Category-level spending totals per month
- [ ] Recurring expenses that auto-populate each month (rent, subscriptions, loan payments)
- [ ] Income tracking — fixed salaries and variable income, monthly and yearly views
- [ ] Savings tracking by category with growth over time
- [ ] Mortgage tracking with amortization schedule
- [ ] Student loan tracking with payment history
- [ ] Loan payoff calculator — "if I pay X/month, paid off in Y years"
- [ ] Savings projection calculator — "if I save X/month, I'll have Y in Z years"
- [ ] Charts and graphs throughout — spending breakdowns, income trends, loan progress, savings growth
- [ ] Drill-down tables available beneath visual summaries for detailed data
- [ ] Household view aggregating all members' data
- [ ] Per-user personal view showing individual finances

### Out of Scope

- Mobile-optimized layout — desktop-first, don't invest in mobile responsiveness
- Real-time bank API integrations — manual entry and file import for now
- Budget targets and alerts — v1 tracks totals, not budgets
- Multi-currency support — NOK only
- Spending trend predictions — v1 focuses on loan payoff and savings projections
- Net worth tracking — may add later, not v1

## Context

- Household in Norway, all finances in NOK
- Mixed income household — some fixed salary, some variable/freelance
- Two loan types to track: mortgage and student loans
- AI document parsing is a key workflow — uploading a bank statement or receipt image and having it automatically parsed into categorized transactions
- Desktop-first, information-dense design — don't be afraid to show data, but each page should have a clear purpose
- Visual-first with optional detail tables — charts/graphs are the primary interface, raw data tables are available for drill-down
- Multiple focused pages > one mega-dashboard — each page does one thing well

## Constraints

- **Tech stack**: Next.js (App Router), modern React, database backend
- **Auth**: Google OAuth via third-party provider (e.g., NextAuth/Auth.js)
- **Currency**: NOK only, no conversion needed
- **Platform**: Desktop-first, responsive is nice-to-have not a requirement
- **AI parsing**: Needs an AI/LLM integration for document/receipt parsing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google OAuth only | Simplest auth, household all has Google | — Pending |
| NOK single currency | Norway-based household, no foreign transactions needed | — Pending |
| Desktop-first | Primary use is at home on computer | — Pending |
| Smart defaults for categories | Lower friction to start, customize as needed | — Pending |
| No budget targets in v1 | Keep v1 focused on tracking actuals, add budgeting later | — Pending |

---
*Last updated: 2026-02-18 after initialization*
