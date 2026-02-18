# Feature Research

**Domain:** Personal household finance app (multi-user, desktop-first, NOK)
**Researched:** 2026-02-18
**Confidence:** MEDIUM — Feature landscape well-established from competitor analysis; specific market research on Norwegian preferences is LOW confidence due to limited local sources.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Expense tracking (manual entry) | Every finance app has this; it's the core activity | LOW | Date, amount, category, notes. Must be fast — friction kills habits |
| Expense categorization (smart defaults) | Users expect categories out of the box; they will not set up 47 categories manually | MEDIUM | Needs a sensible default taxonomy (Food, Transport, Housing, etc.) + ability to rename/add. Smart auto-suggestion on entry |
| Income tracking | Half of "where did my money go?" is knowing what came in | LOW | Similar to expense — date, amount, source. Recurring income patterns |
| Monthly budget/dashboard view | Users open the app to see "how am I doing this month" | MEDIUM | Running totals vs. budget, category breakdown, month-over-month comparison |
| Charts and graphs | Finance data without visualization is raw numbers users don't act on | MEDIUM | Bar charts for spending by category, line charts for trends over time. Drill-down to transaction list is expected |
| Recurring expense tracking | Bills, subscriptions, rent — these need to be handled without re-entry | MEDIUM | Mark transaction as recurring, set period. Auto-suggest when pattern detected |
| CSV import | Users have bank statements; they expect to import them | MEDIUM | Map columns (date, amount, description) to internal schema. Duplicate detection is critical |
| Multi-user household access | Couples and households share finances; they expect to share an app | MEDIUM | Shared view of all household transactions. Separate logins. Role control (who can see/edit what) |
| Loan / debt tracking | Mortgage and student loans are major household financial facts | MEDIUM | Balance, interest rate, monthly payment, payoff date estimate. Not necessarily full amortization tables at v1 |
| Savings tracking | Savings goals (emergency fund, vacation, etc.) are a top user motivation | LOW | Target amount, current amount, deadline, progress bar |
| Net worth snapshot | Assets minus liabilities = single number users want to watch trend upward | LOW | Sum of savings + investments minus loans. No real-time feed needed; manual or import-based is fine |
| Category drill-down | Charts without the ability to see individual transactions are opaque | LOW | Click chart segment → filtered transaction list. Standard UX pattern |
| Search and filter transactions | Users need to find "that restaurant charge from October" | LOW | Free-text search, date range filter, category filter, amount range |
| Data export | Users want their data out; no export = lock-in anxiety | LOW | CSV export of transactions. PDF of monthly summary is a nice-to-have |
| Authentication (Google OAuth) | Secure login is non-negotiable; OAuth removes password management burden | LOW | Google OAuth via NextAuth. Session persistence. |

---

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI document parsing (bank statements, invoices) | Most apps require manual entry or CSV mapping. Drag-and-drop a PDF bank statement and get transactions extracted automatically is a real time-saver | HIGH | LLM-based extraction (e.g., GPT-4 Vision or similar). Needs review step — AI will make errors. Confidence scores per transaction. Deduplication with manually-entered or CSV-imported data |
| Monthly snapshot dashboard | A clear "state of finances this month" landing page is what separates actionable apps from data dumps. Competitors often overwhelm with too many views | MEDIUM | Single-screen: income vs. expenses, top categories, savings progress, upcoming recurring items. Design-led, not feature-led |
| Prediction calculators | "If I keep spending at this rate, I'll have X left on the 30th" and "when will this loan be paid off" are high-value questions competitors handle poorly | MEDIUM | Cash-flow forecast (rolling 30-90 days based on recurring items + spending rate). Loan payoff calculator with extra payment scenarios |
| Household-native design | Most apps bolt on sharing as an afterthought. Building household-first from day one — shared categories, split costs, joint goals — is a differentiator | HIGH | Shared vs. personal expense tagging. Per-member spend breakdown. Joint savings goals. This requires careful data model design upfront |
| Smart transaction suggestions | Suggesting category + merchant name based on past entries (or similar entries in the household) reduces friction dramatically | MEDIUM | Local pattern matching first (what has this household categorized similarly before?). Fuzzy match on merchant description. No cloud ML needed at v1 |
| Recurring detection | Automatically identifying "this looks like your monthly Netflix charge" removes manual work | MEDIUM | Pattern detection on amount + merchant over time. Surface as suggestion, user confirms |
| NOK-native UX | Most apps default to USD with awkward currency conversion. A product built for NOK with Norwegian spending categories (mat, transport, barnehage, etc.) resonates with the audience | LOW | Currency formatting (kr 1 234,50 format). Norwegian default category taxonomy. No conversion needed |
| Drill-down beneath charts | Competitors show charts; clicking through to the underlying transactions is often clunky. Making this seamless is a quality differentiator | LOW | Every chart element is clickable → filtered transaction table. Breadcrumb navigation. Fast |
| Desktop-first, data-dense UI | Most finance apps are mobile-first and limit data density. A desktop-first app can show more, do more, and appeal to users who manage finances on a laptop | MEDIUM | Wide layouts with sidebars. Keyboard shortcuts. Dense tables with inline edit. Contrast with mobile-first competitors |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time bank account sync (Open Banking / PSD2) | Users want automatic transaction import without CSV | In Norway, PSD2 integration requires bank-specific consent flows, maintenance of integrations per bank, token refresh, and security compliance. High ongoing maintenance. Competitors who do this spend enormous engineering effort keeping integrations alive. Wrong trade-off for a small team | Prioritize excellent CSV import + AI document parsing. Users can export from their bank and import. Lower friction than it sounds if import is fast |
| Investment portfolio tracking | Users want to see their stock/fund performance | This is a different domain (real-time pricing feeds, tax lot accounting, Norwegian fund APIs). Adds scope without serving the core household budgeting use case. Competitors who do this (Empower) are essentially two products | Track investment accounts as a balance/asset for net worth purposes only. Defer portfolio analytics entirely |
| Bill payment / money transfer | Users want to pay bills from the app | This requires banking license, payment infrastructure, regulatory compliance. Out of scope for a budgeting tool. Attempting this creates massive legal and operational burden | Track bills as recurring expenses. Remind user when due. Link to bank's payment flow if needed |
| Gamification (badges, streaks, leaderboards) | Apps with gamification show 28% better retention in research | Finance gamification feels condescending to adult users of a household finance tool. Couples tracking a mortgage don't want to earn a "Savings Star" badge | Good UX and visible progress toward goals provides intrinsic motivation without game mechanics |
| Social/community features (share budgets, compare spending) | Some apps let users compare with "people like you" | Privacy expectations for financial data are extremely high. Users are uncomfortable sharing financial details even anonymously. Trust damage from a data incident is catastrophic | Provide percentile context ("your food spending is above average for a 2-person household in Norway") without sharing data. Static benchmarks from public statistics |
| Mobile app (iOS/Android) | Most users expect a mobile app | Desktop-first web app is the stated scope. Building a quality mobile app doubles the surface area, QA burden, and deployment complexity. A responsive web app accessed on mobile covers basic needs | Build a responsive web design that works acceptably on mobile for reference lookups. Explicit mobile-first is a v2 consideration |
| AI financial advice ("you should invest in X") | Users want personalized advice | Financial advice is a regulated activity in Norway. Providing investment or insurance recommendations without authorization creates legal liability. The line between "insight" (legal) and "advice" (regulated) is thin | Show trends and patterns ("your spending on X is up 20% this month"). Never recommend specific financial products or actions |

---

## Feature Dependencies

```
[Google OAuth]
    └──required by──> [Multi-user Households]
                          └──required by──> [Shared Expense View]
                          └──required by──> [Per-member Spend Breakdown]
                          └──required by──> [Joint Savings Goals]

[Expense Tracking]
    └──required by──> [Category Drill-down]
    └──required by──> [Charts and Graphs]
    └──required by──> [Monthly Dashboard]
    └──required by──> [Recurring Detection]
    └──required by──> [Smart Transaction Suggestions]
    └──required by──> [Prediction Calculators]

[CSV Import]
    └──enhances──> [Expense Tracking] (bulk entry)
    └──requires──> [Duplicate Detection]

[AI Document Parsing]
    └──enhances──> [CSV Import] (handles PDFs instead of just CSV)
    └──requires──> [Review/Confirmation Step] (AI errors need human verification)
    └──requires──> [Duplicate Detection]

[Income Tracking]
    └──required by──> [Monthly Dashboard] (income vs. expense comparison)
    └──required by──> [Prediction Calculators] (cash flow requires knowing income)

[Loan Tracking]
    └──required by──> [Net Worth Snapshot] (liabilities side)
    └──enhances──> [Prediction Calculators] (loan payoff scenarios)

[Savings Tracking]
    └──required by──> [Net Worth Snapshot] (assets side)
    └──enhances──> [Monthly Dashboard] (savings progress widget)

[Recurring Expense Tracking]
    └──required by──> [Prediction Calculators] (future cash flow depends on known recurring items)
    └──enhances──> [Monthly Dashboard] (upcoming bills widget)

[Charts and Graphs]
    └──required by──> [Category Drill-down] (drill-down is a chart interaction)
```

### Dependency Notes

- **Multi-user Households requires Google OAuth:** Household membership and permissions are tied to authenticated identities. Single-user anonymous mode is not worth supporting.
- **Prediction Calculators require Recurring + Income:** Without knowing recurring obligations and income, predictions are meaningless. Build these foundations first.
- **AI Document Parsing requires a Review step:** LLM extraction has error rates. Showing extracted transactions for user confirmation before saving is non-negotiable. Silently auto-saving AI results will create data integrity problems.
- **Duplicate Detection is a shared concern:** CSV import, AI parsing, and manual entry can all produce duplicates. This logic must be centralized and tested early.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed for a household to run their finances on this tool.

- [ ] Google OAuth — required for everything else; no login = no product
- [ ] Multi-user households — two people, shared view, separate logins; this is the core differentiator
- [ ] Manual expense + income entry — fast form, smart category suggestions, validation
- [ ] Smart default categories (NOK/Norwegian context) — mat, transport, bolig, barnehage, helse, osv.
- [ ] Recurring expense marking — users need to record rent and subscriptions without re-entering monthly
- [ ] CSV import with column mapping — the practical path to getting historical data in; duplicate detection required
- [ ] Monthly dashboard — income vs. expenses, top categories, month navigation
- [ ] Charts with drill-down — spending by category (bar), trend over time (line), click → transaction list
- [ ] Loan tracking (mortgage, student loans) — balance, rate, payment; part of the household financial picture
- [ ] Savings tracking — goals with progress; motivates engagement
- [ ] Net worth snapshot — assets minus liabilities; the number users watch long-term

### Add After Validation (v1.x)

Features to add once core is validated and users are active.

- [ ] AI document parsing (PDF bank statements) — high-value differentiator; add when manual + CSV pattern is established and user demand is clear
- [ ] Prediction calculators — cash flow forecast, loan payoff scenarios; requires recurring + income data to be clean first
- [ ] Recurring auto-detection — surface suggestions based on transaction patterns; requires a few months of data
- [ ] Data export (CSV + PDF summary) — users will ask for this; straightforward to add
- [ ] Search and filter — important for any user with 3+ months of data

### Future Consideration (v2+)

Features to defer until product-market fit established.

- [ ] Mobile-optimized responsive views — defer until desktop usage patterns are clear; don't optimize for mobile before the desktop product is mature
- [ ] Advanced household features (split costs, per-member budgets) — requires the basic shared view to be proven first
- [ ] Notification / reminder system — "upcoming bill" alerts; useful but not core to the financial tracking loop
- [ ] Norwegian category taxonomy refinements based on user feedback — iterate on defaults with real data

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Google OAuth | HIGH | LOW | P1 |
| Multi-user households | HIGH | MEDIUM | P1 |
| Manual expense entry | HIGH | LOW | P1 |
| Smart default categories (NOK) | HIGH | LOW | P1 |
| Monthly dashboard | HIGH | MEDIUM | P1 |
| CSV import + duplicate detection | HIGH | MEDIUM | P1 |
| Charts with drill-down | HIGH | MEDIUM | P1 |
| Loan tracking | MEDIUM | LOW | P1 |
| Savings tracking | MEDIUM | LOW | P1 |
| Recurring expense marking | HIGH | LOW | P1 |
| Net worth snapshot | MEDIUM | LOW | P1 |
| AI document parsing | HIGH | HIGH | P2 |
| Prediction calculators | HIGH | MEDIUM | P2 |
| Recurring auto-detection | MEDIUM | MEDIUM | P2 |
| Search and filter | MEDIUM | LOW | P2 |
| Data export | LOW | LOW | P2 |
| Mobile-optimized views | MEDIUM | HIGH | P3 |
| Advanced split costs | MEDIUM | HIGH | P3 |
| Notification / reminders | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | YNAB | Monarch Money | Copilot | Our Approach |
|---------|------|---------------|---------|--------------|
| Multi-user sharing | Up to 6 users, one membership | Free to add household members, shared views | Limited | Household-native, designed for 2-person household from the start |
| Bank sync | Yes (Plaid) | Yes (13,000+ institutions) | Yes | Deliberate NO — CSV + AI import instead. Avoids PSD2 complexity |
| AI features | Minimal | AI Assistant for insights | Smart categorization, forecasting | AI document parsing (PDFs) + smart suggestions on entry |
| Budgeting method | Zero-based (envelope) | Flexible (rollover, goals, flex) | Track-and-visualize | Track-and-visualize with optional budget targets |
| Loan/debt tracking | Loan payoff simulator | Yes, integrated | Limited | Loan tracking with payoff date estimate + calculator |
| Desktop UX | Web + mobile | Web + mobile | Mac-first, web launched 2024 | Desktop-first, data-dense; intentional |
| Charts | Basic | Strong with net worth | Strong, polished | Strong charts with drill-down as a first-class interaction |
| NOK / Nordic support | Poor (USD-default) | Poor | Poor | Native NOK formatting, Norwegian default categories |
| CSV import | Yes | Yes | Yes | Yes + AI document parsing for PDFs |
| Pricing | $109/year | Subscription | $95/year | Self-hosted / personal; no SaaS pricing concern |

---

## Sources

- [Key Features Every Personal Finance App Needs in 2026 - Financial Panther](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/) — MEDIUM confidence
- [The Best Budget Apps for 2026 - NerdWallet](https://www.nerdwallet.com/finance/learn/best-budget-apps) — HIGH confidence (established reviewer)
- [Copilot vs YNAB: Best Budgeting App Comparison 2024](https://www.myscale.com/blog/budgeting-apps-copilot-vs-ynab-2024/) — MEDIUM confidence
- [Monarch Money Review 2026 - Marriage Kids and Money](https://marriagekidsandmoney.com/monarch-money-review/) — MEDIUM confidence
- [10 Best Budget Apps for Families and Couples - Marriage Kids and Money](https://marriagekidsandmoney.com/best-budget-apps-for-families/) — MEDIUM confidence
- [Monarch Money - Official features page](https://www.monarch.com/features/tracking) — HIGH confidence (official)
- [Personal Finance App With CSV Import - Koody](https://koody.com/blog/personal-finance-app-csv-import) — MEDIUM confidence
- [Personal Finance App Industry Statistics 2025 - Coinlaw](https://coinlaw.io/personal-finance-app-industry-statistics/) — MEDIUM confidence
- [What Users Want in a Personal Finance App - Blue Train](https://www.bluetrain.co.uk/blog/what-users-want-in-a-personal-finance-app-key-features-marketing-insights/) — LOW confidence (single source)
- [Spiir - Nordic personal finance app](https://www.spiir.com) — MEDIUM confidence (competitor in Nordic market)
- [Best Budgeting Apps for 2026 - Engadget](https://www.engadget.com/apps/best-budgeting-apps-120036303.html) — HIGH confidence (established reviewer)

---

*Feature research for: Personal household finance app (Next.js, multi-user, NOK)*
*Researched: 2026-02-18*
