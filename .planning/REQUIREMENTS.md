# Requirements: Household Economy

**Defined:** 2026-02-18
**Core Value:** Give our household a clear, always-current view of where money comes from, where it goes, and how our financial position is trending.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign in with Google OAuth
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can log out from any page

### Expense Tracking

- [ ] **EXPN-01**: User can create an expense with date, amount (NOK), category, and optional notes
- [ ] **EXPN-02**: User can edit an existing expense
- [ ] **EXPN-03**: User can delete an expense (soft delete)
- [ ] **EXPN-04**: User can view expenses filtered by month, category, or date range
- [ ] **EXPN-05**: App provides smart default expense categories in Norwegian context (mat, transport, bolig, helse, etc.)
- [ ] **EXPN-06**: User can create, rename, and delete custom categories

### Recurring Expenses

- [ ] **RECR-01**: User can define a recurring expense rule (amount, category, frequency: weekly/monthly/annual)
- [ ] **RECR-02**: Recurring expenses auto-populate for the current and future months
- [ ] **RECR-03**: User can edit a single occurrence without changing the rule
- [ ] **RECR-04**: User can edit the rule to change all future occurrences

### Income Tracking

- [ ] **INCM-01**: User can record income entries (date, amount, source, type: salary/variable)
- [ ] **INCM-02**: User can view income by month and by year
- [ ] **INCM-03**: User can define recurring income (salary) that auto-populates monthly

### Data Import

- [ ] **IMPT-01**: User can upload a CSV file from their bank
- [ ] **IMPT-02**: App detects CSV format (delimiter, date format, decimal separator) for Norwegian bank exports
- [ ] **IMPT-03**: User can map CSV columns to transaction fields before import
- [ ] **IMPT-04**: App detects and flags duplicate transactions before committing import
- [ ] **IMPT-05**: User sees a preview of parsed transactions before confirming import

### AI Document Parsing

- [ ] **AIDP-01**: User can upload a PDF bank statement or receipt image
- [ ] **AIDP-02**: App uses AI to extract transaction data (date, amount, description, category) from the document
- [ ] **AIDP-03**: User reviews AI-extracted transactions with the original document visible before confirming
- [ ] **AIDP-04**: User can correct any AI-extracted field before saving

### Dashboard

- [ ] **DASH-01**: Dashboard shows monthly snapshot: total income, total expenses, and savings rate for the current month
- [ ] **DASH-02**: Dashboard shows spending totals broken down by category for the current month
- [ ] **DASH-03**: User can navigate between months on the dashboard
- [ ] **DASH-04**: Dashboard shows upcoming recurring expenses for the current month

### Charts & Visualization

- [ ] **CHRT-01**: App displays spending by category as a chart (bar or pie)
- [ ] **CHRT-02**: App displays spending trend over time as a line/area chart
- [ ] **CHRT-03**: User can click any chart element to drill down into a filtered transaction table
- [ ] **CHRT-04**: App displays income vs. expenses comparison chart

### Loan Tracking

- [ ] **LOAN-01**: User can add a loan (mortgage or student loan) with principal, interest rate, term, and start date
- [ ] **LOAN-02**: App displays current estimated balance and remaining term
- [ ] **LOAN-03**: User can record loan payments
- [ ] **LOAN-04**: App shows loan payment history

### Savings

- [ ] **SAVG-01**: User can create a savings goal with name, target amount, and optional target date
- [ ] **SAVG-02**: User can update current saved amount for a goal
- [ ] **SAVG-03**: App shows progress toward each savings goal (amount and percentage)

### Loan Calculator

- [ ] **CALC-01**: User can input loan parameters (remaining balance, interest rate, monthly payment) and see estimated payoff date
- [ ] **CALC-02**: User can adjust monthly payment amount to see how it affects payoff date and total interest paid

### General UX

- [ ] **GUIX-01**: All monetary amounts display in Norwegian format (123 456,78 kr)
- [ ] **GUIX-02**: Desktop-first layout with information-dense pages
- [ ] **GUIX-03**: Every data view has an optional drill-down table showing detailed records
- [ ] **GUIX-04**: App uses a modern, sleek visual design with clear navigation between pages

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-User Household

- **HSHD-01**: Multiple users can belong to the same household with separate logins
- **HSHD-02**: User can toggle between personal view (own data) and household view (all members)
- **HSHD-03**: Household aggregate dashboard showing combined finances

### Predictions & Projections

- **PRED-01**: Savings growth projector ("if I save X/month, I'll have Y in Z years")
- **PRED-02**: Spending trend predictions based on recent months
- **PRED-03**: Cash flow forecast (projected balance over next 30-90 days)

### Enhanced Features

- **ENHC-01**: Recurring expense auto-detection from transaction patterns
- **ENHC-02**: Search and filter across all transactions
- **ENHC-03**: Data export (CSV + PDF monthly summary)
- **ENHC-04**: Net worth snapshot (assets minus liabilities)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time bank API sync (PSD2/Open Banking) | Maintenance burden of Norwegian bank integrations outweighs UX gain; CSV + AI import covers the need |
| Mobile-optimized layout | Desktop-first; responsive is nice-to-have, not a focus |
| Budget targets and alerts | v1 tracks totals, not budgets |
| Multi-currency support | NOK only for this household |
| Investment portfolio tracking | Different domain; track as balance for net worth only |
| Bill payment / money transfer | Requires banking license, regulatory compliance |
| Social/community features | Privacy expectations for financial data are too high |
| AI financial advice | Regulated activity in Norway; show trends, never recommend |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| GUIX-01 | Phase 1 | Pending |
| GUIX-02 | Phase 1 | Pending |
| GUIX-04 | Phase 1 | Pending |
| EXPN-01 | Phase 2 | Pending |
| EXPN-02 | Phase 2 | Pending |
| EXPN-03 | Phase 2 | Pending |
| EXPN-04 | Phase 2 | Pending |
| EXPN-05 | Phase 2 | Pending |
| EXPN-06 | Phase 2 | Pending |
| RECR-01 | Phase 2 | Pending |
| RECR-02 | Phase 2 | Pending |
| RECR-03 | Phase 2 | Pending |
| RECR-04 | Phase 2 | Pending |
| INCM-01 | Phase 2 | Pending |
| INCM-02 | Phase 2 | Pending |
| INCM-03 | Phase 2 | Pending |
| GUIX-03 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| CHRT-01 | Phase 3 | Pending |
| CHRT-02 | Phase 3 | Pending |
| CHRT-03 | Phase 3 | Pending |
| CHRT-04 | Phase 3 | Pending |
| LOAN-01 | Phase 3 | Pending |
| LOAN-02 | Phase 3 | Pending |
| LOAN-03 | Phase 3 | Pending |
| LOAN-04 | Phase 3 | Pending |
| SAVG-01 | Phase 3 | Pending |
| SAVG-02 | Phase 3 | Pending |
| SAVG-03 | Phase 3 | Pending |
| CALC-01 | Phase 3 | Pending |
| CALC-02 | Phase 3 | Pending |
| IMPT-01 | Phase 4 | Pending |
| IMPT-02 | Phase 4 | Pending |
| IMPT-03 | Phase 4 | Pending |
| IMPT-04 | Phase 4 | Pending |
| IMPT-05 | Phase 4 | Pending |
| AIDP-01 | Phase 5 | Pending |
| AIDP-02 | Phase 5 | Pending |
| AIDP-03 | Phase 5 | Pending |
| AIDP-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after roadmap creation — traceability populated*
