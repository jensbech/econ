# Pitfalls Research

**Domain:** Personal Household Finance App (Next.js, multi-user, NOK)
**Researched:** 2026-02-18
**Confidence:** MEDIUM — based on community wisdom, production post-mortems, and real-world incident reports; cross-verified where possible

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or complete loss of user trust.

---

### Pitfall 1: Broken Access Control — User Sees Another Household's Data

**What goes wrong:**
A multi-user household app starts simple — one user, one dataset. As multi-household support is bolted on, `WHERE user_id = ?` queries silently become missing from some routes. One household member can read (or modify) another household's transactions, loans, or savings. This is not hypothetical: the Money Lover finance app shipped this exact bug in production, exposing all transactions across users.

**Why it happens:**
Authentication (is this a valid user?) is implemented, but authorization (is this user allowed to access this specific resource?) is treated as a secondary concern. Server actions and API routes get written quickly without a consistent ownership-check pattern. The bug is invisible in testing because the test user always owns the test data.

**How to avoid:**
- Establish a mandatory ownership-check helper (e.g., `assertHouseholdAccess(userId, resourceId)`) and call it at the top of every server action and route handler
- Add a `household_id` column to every data table and enforce it in every DB query — never fetch by primary key alone
- Write integration tests where User A attempts to read/modify User B's data and assert 403/404
- At DB level, consider Row-Level Security (Postgres RLS) as a final safety net

**Warning signs:**
- Any query that fetches by resource ID without also filtering on `household_id` or `user_id`
- Server actions that receive a resource ID from the client and trust it without re-validating ownership
- No test coverage for cross-household access attempts

**Phase to address:**
Auth and data model phase (Phase 1 / foundation). Must be solved before any feature is built on top.

---

### Pitfall 2: Storing Money as Floating-Point Numbers

**What goes wrong:**
Expenses, income, and loan balances stored as JavaScript `number` (IEEE 754 double) accumulate rounding errors. `100.45` cannot be represented exactly in binary. After enough additions and subtractions, totals diverge from reality. A dashboard showing NOK 12,450.00 monthly spending may actually total NOK 12,449.97 internally. Charts and summaries lie silently.

**Why it happens:**
JavaScript's default numeric type is floating-point. Developers who are not experienced in financial systems use `parseFloat()` on every incoming value and store the result. The bug is invisible until large transaction volumes or specific decimal amounts trigger it.

**How to avoid:**
- Store all monetary values in the database as integers (øre: 1 NOK = 100 øre). `NOK 1,234.50` → `123450` integer
- Use `decimal`/`numeric` columns in Postgres, never `float` or `double precision`
- Parse incoming values to integer on ingestion; format back to display value only in the UI layer
- Use a library like `dinero.js` for any arithmetic that must stay in-flight as a decimal

**Warning signs:**
- Any `FLOAT` or `REAL` column for an amount field in the DB schema
- `parseFloat()` called on a currency string going into the database
- Totals that are "close but not exact" in test assertions

**Phase to address:**
Data model design (Phase 1). Retroactively fixing float→integer in a production DB with existing data is painful.

---

### Pitfall 3: Designing a Single-User Data Model and Bolting On Multi-Household Later

**What goes wrong:**
The app is built assuming one user = one set of data. Personal and shared views are added later by adding a `is_shared` flag or creating a second account. The result is a schema where "personal vs. household" is not a first-class concept — reports mix personal and shared data incorrectly, permission checks are inconsistent, and the household concept is a leaky abstraction throughout the UI.

**Why it happens:**
The solo developer starts simple ("I'll add the household stuff later") and the single-user assumption bakes into 50 routes before the multi-user layer is attempted. Adding a household dimension retroactively requires touching nearly every query.

**How to avoid:**
- Design with `User → HouseholdMembership → Household` from day one, even if only one household exists in MVP
- Every transaction, income record, loan, and savings entry is owned by a `household_id`, not a `user_id`
- Personal-only records are flagged via `visibility: 'personal' | 'household'`, scoped under the household
- Implement both personal-only and shared views in Phase 1 even if skeletal — proves the model works

**Warning signs:**
- Schema where transactions have `user_id` but no `household_id`
- "I'll add household support in Phase 3" as a plan when multi-user is a stated requirement

**Phase to address:**
Data model and auth phase (Phase 1). Non-negotiable foundation item.

---

### Pitfall 4: AI/OCR Document Parsing Treated as Reliable — No Fallback

**What goes wrong:**
AI document parsing (PDFs, photos of receipts) is shipped as a primary input path without validation. The model hallucinates amounts, misreads dates (e.g., `06/07` as June 7 vs. July 6), or invents transaction descriptions. Users trust the import, never verify, and the database fills with garbage data. Discovering this after 6 months of transactions is a support nightmare.

**Why it happens:**
AI demos look impressive and accurate on clean documents. Production documents are skewed photos, multi-column bank PDFs, Norwegian date formats (`dd.mm.yyyy`), and documents with promotional boxes the parser treats as transactions. The "3% accuracy gap" in OCR — where 3% of values require correction — means 3 errors per 100 transactions, compounding over time.

**How to avoid:**
- AI parsing is a suggestion layer, not a commit layer: every parsed result is presented to the user for review before saving
- Show the original document side-by-side with parsed fields so the user can spot mismatches immediately
- Validate parsed amounts are reasonable (e.g., within range, not negative where not expected)
- Flag and quarantine documents where confidence is below threshold for mandatory manual review
- Store the raw extracted text alongside the parsed result for debugging

**Warning signs:**
- Parsed documents saved to DB without user confirmation step
- No confidence scoring on extracted fields
- Norwegian date formats (`dd.mm.yyyy`) not explicitly handled in the date parser — treated as ISO or US format

**Phase to address:**
AI import feature phase. Design the confirmation UX before building the parser.

---

### Pitfall 5: CSV Import Breaks on Norwegian Bank Formats

**What goes wrong:**
Norwegian banks (DNB, Nordea, Sbanken/Sparebank, etc.) each export CSV in subtly different formats: some use semicolons as delimiters (because commas appear in Norwegian text), some include a BOM character, some use `dd.mm.yyyy` dates, some use `1 234,50` number format (space as thousands separator, comma as decimal). A parser that works on DNB breaks silently on Nordea — it imports with wrong amounts or wrong dates with no error message.

**Why it happens:**
Developers test with one bank's export format and assume CSV is CSV. The edge cases (encoding, delimiter, decimal separator, date format, header row variations) are not discovered until users report corrupt data months later.

**How to avoid:**
- Collect sample CSV exports from at least DNB, Nordea, and Sparebank 1 before building the parser
- Build a format-detection layer: infer delimiter (`,` vs `;`), decimal separator (`.` vs `,`), and date format from the file before parsing
- Always preview parsed results (first N rows) to the user before committing import
- Strip BOM characters on read; handle UTF-8 and ISO-8859-1 (common in older Norwegian bank exports)
- Reject rows with unparseable dates or amounts — surface them as errors rather than silently skipping

**Warning signs:**
- Parser assumes `,` delimiter and `.` decimal without detection
- No handling of Norwegian number format `1 234,50`
- No preview step before import commits to the database

**Phase to address:**
CSV import phase. Requires real Norwegian bank test files — collect them before writing the parser.

---

### Pitfall 6: Recurring Transactions Modeled as Repeated Individual Records

**What goes wrong:**
Recurring expenses (rent, subscriptions, loan repayments) are stored as individual transaction records with no link between them. When the rent amount changes, the user must edit every past and future occurrence. Reports treat "predicted future" and "already occurred" as the same thing. Editing or deleting a recurring series is impossible — there is no series.

**Why it happens:**
The simplest implementation is "just create a transaction for each month." Developers underestimate how frequently amounts change (rent increase, subscription price change) and how important the distinction between past (actual) and future (predicted) is for forecasting.

**How to avoid:**
- Model recurring rules as a separate `RecurringRule` entity with: frequency, amount, category, start date, end date (nullable), and `household_id`
- Generated future occurrences are projections, not committed records — they become actual records when marked as paid or when the date passes
- Allow rule-level edits ("change all future") and instance-level edits ("change just this one")
- The data model distinction between `RecurringRule` and `Transaction` is load-bearing for the prediction calculators

**Warning signs:**
- `is_recurring: boolean` on the Transaction table with no separate rule entity
- No distinction in the schema between past actuals and future projections

**Phase to address:**
Expense tracking phase (before building prediction calculators, which depend on this model).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing amounts as `float` | Simpler code | Rounding errors compound; migration painful | Never |
| Skipping `household_id` on early tables | Faster initial build | Requires schema migration + touching every query later | Never |
| Hardcoding category list | Avoids category management UI | Users with non-standard Norwegian expense patterns (e.g., hytte, barnehage) can't categorize correctly | MVP only if categories are editable later |
| No soft delete (hard delete transactions) | Simpler queries | Accidental deletions are unrecoverable; no audit trail for multi-user disputes | Never for financial records |
| Client-side ownership check only | Simpler code | Bypassed by any user modifying the fetch URL | Never |
| Caching chart data with no invalidation | Faster page loads | Charts show stale data after edits; trust erodes | Only with short TTL + explicit invalidation on write |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google OAuth | Not handling refresh token expiry/revocation — user silently loses access mid-session | Implement token refresh logic; catch `invalid_grant` errors; redirect to re-auth gracefully rather than showing a broken state |
| Google OAuth | Storing only access token, not refresh token | Request `offline` access scope; store refresh token securely in DB for long-lived sessions |
| AI document parsing | Treating LLM output as structured data without validation | Parse LLM response with a schema validator (e.g., Zod); reject malformed output; show the user what failed |
| Norwegian bank CSV | Assuming UTF-8 encoding | Detect encoding; handle ISO-8859-1 which some older Norwegian bank exports use |
| Next.js Server Actions | Calling your own API route from a server component instead of calling the DB/service directly | In Server Components and Actions, call the data layer directly — no internal HTTP round-trips |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 queries in transaction list | List pages slow as transaction count grows; each row triggers a separate category/account lookup | Use JOIN or `include` in ORM; add composite indexes on `(household_id, date)` | ~500+ transactions per household |
| Fetching all transactions for chart aggregation | Dashboard load time grows linearly with transaction history | Aggregate in the DB with GROUP BY; never send raw transaction rows to the frontend for chart rendering | ~1,000+ transactions |
| Recalculating loan amortization schedule on every page load | Loan detail pages slow; repeated CPU work | Cache amortization schedule; recalculate only when loan parameters change | Immediately noticeable with 30-year mortgage (360 rows) |
| Re-running prediction calculator in the client | Prediction page slow or laggy on older hardware (desktop-first but still has limits) | Pre-compute projections server-side or in a worker; cache results | Projections beyond 5 years with monthly granularity |
| Loading unoptimized chart libraries for information-dense dashboard | Large JS bundle; slow initial paint | Use server-side chart rendering or a lightweight lib; code-split chart components | Any page load; especially on first visit |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Authorization check only on the client (hiding UI elements) | Any user can craft a direct fetch to another household's data | Enforce authorization in every server action and API route, regardless of UI state |
| Logging full transaction amounts or descriptions in server logs | Financial data exposed in log aggregation tools | Sanitize logs; never log raw financial values; log IDs only |
| Storing OAuth tokens in `localStorage` | XSS attack can exfiltrate tokens | Store session in HttpOnly cookie; use NextAuth.js session management |
| Exposing household member list to non-members | Membership enumeration | Membership queries must also validate the requesting user is a member of the household |
| Trusting client-sent `household_id` in forms | User can switch to another household's ID | Always derive `household_id` from the authenticated session, never from form payload |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-categorizing transactions without review | 31% miscategorization rate industry-wide; users see "Gym membership → Entertainment" and stop trusting the app | Show AI category as a suggestion with confidence; allow one-click correction; learn from corrections |
| No confirmation before bulk CSV import | Duplicate transactions from re-importing the same file; user has to manually delete dozens of records | Show preview with duplicate detection before committing; flag rows that match existing transactions by date+amount |
| Y-axis not starting at zero on spending charts | Small variations look dramatic; users misread their spending trends | Default all bar/column charts to zero-based Y-axis; use truncated axis only for line charts showing changes over time |
| Exposing raw NOK amounts without formatting | `123456.78` is harder to read than `123 456,78 kr` (Norwegian convention) | Apply Norwegian number formatting everywhere: space as thousands separator, comma as decimal, `kr` suffix |
| Information-dense UI with no visual hierarchy | Users can't distinguish "current month actuals" from "projected future" | Use clear visual language: actuals in solid colors, projections in muted/dashed; add a legend on every chart |
| Prediction calculator with no uncertainty indicator | Users treat projections as guarantees; bad financial decisions follow | Show a confidence range (e.g., ±10%) or explicitly label projections as estimates; explain assumptions |

---

## "Looks Done But Isn't" Checklist

- [ ] **Multi-user auth:** Verify that User A cannot fetch, edit, or delete User B's transactions even by knowing the transaction ID — requires an explicit cross-household test case
- [ ] **CSV import:** Test with real Norwegian bank export files from at least 3 banks before declaring "done" — format differences are not visible in unit tests with synthetic data
- [ ] **Recurring expenses:** Verify that editing "all future occurrences" of a recurring rule does not retroactively change past actuals
- [ ] **Loan amortization:** Verify that extra payments reduce the principal correctly and shorten the amortization term — not just reduce the remaining balance display
- [ ] **Charts:** Verify that adding a new transaction in the current month immediately updates dashboard charts — stale cache is invisible in development where data changes rarely
- [ ] **AI document parsing:** Verify that a skewed or low-quality photo returns an error with a recovery path, not a crash or silent empty result
- [ ] **Session expiry:** Verify that a user whose OAuth token was revoked (e.g., they removed the app from Google permissions) gets a clean re-auth prompt, not a broken error page
- [ ] **Household switching:** If a user belongs to multiple households, verify that switching households clears all cached data from the previous household — no data leakage through cached state
- [ ] **NOK formatting:** Verify `123456.78` renders as `123 456,78 kr` everywhere — including in CSV exports and chart tooltips, not just the main transaction list

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Float amounts in production DB | HIGH | Write migration to convert `float` → `integer øre`; requires auditing every amount for precision loss; may need user notification if totals changed |
| Missing household_id on existing tables | HIGH | Schema migration + backfill; requires downtime or careful zero-downtime migration; touches every query in the codebase |
| Corrupt data from CSV import without preview | MEDIUM | Soft delete makes bulk rollback possible; implement a per-import `import_batch_id` so users can undo an entire import |
| Miscategorized AI imports | LOW-MEDIUM | Bulk recategorization UI; if categories are correctable, the data is recoverable; no rewrite needed |
| Broken access control discovered in prod | HIGH | Immediate incident; audit log required to determine what was exposed; potential regulatory/trust implications |
| No soft delete — accidental transaction deletion | HIGH | Restore from DB backup (requires backup strategy); no self-service recovery for users |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Broken access control (cross-household data leak) | Phase 1: Auth + Data Model | Integration test: User A cannot access User B's resource by ID |
| Float monetary storage | Phase 1: Data Model | Schema review: all amount columns are `integer` or `numeric`; no `float`/`real` |
| Single-user model without household dimension | Phase 1: Data Model | Schema has `household_id` on all financial entities from day 1 |
| Recurring transactions without rule entity | Phase 2: Expense Tracking | Schema has separate `RecurringRule` table; transactions reference rule ID |
| CSV import format failures | Phase 2–3: CSV Import | Tested with real DNB, Nordea, and Sparebank 1 CSV exports |
| AI parsing without user confirmation | Phase 3–4: AI Document Import | No parsed document is committed without a user confirmation step |
| No soft delete / no audit trail | Phase 1: Data Model | All financial record deletes are soft (`deleted_at`); bulk-import has `import_batch_id` |
| N+1 queries on transaction list | Phase 2: Expense Tracking | Query count assertion in test: listing transactions makes ≤3 DB queries |
| OAuth token refresh not handled | Phase 1: Auth | Test: expired/revoked token redirects to re-auth, not error page |
| Norwegian number/date format errors | All phases | UI review checklist: all displayed amounts use `123 456,78 kr` format |

---

## Sources

- Money Lover data exposure incident: [Dark Reading — Money Lover Finance App Exposes User Data](https://www.darkreading.com/application-security/-money-lover-finance-app-exposes-user-data)
- OWASP Broken Access Control #1: [Fintech App Security — Neontri](https://neontri.com/blog/fintech-app-security/)
- Float/currency rounding: [Modern Treasury — Floats Don't Work for Storing Cents](https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents); [Atomic Object — Floating Point Currency Rounding Errors](https://spin.atomicobject.com/currency-rounding-errors/)
- AI categorization: [Expense Sorted — AI Expense Categorization](https://www.expensesorted.com/blog/ai-expense-categorization-personal-finance-apps); [BBVA AI Factory — How AI Models Classify Expenses](https://www.bbvaaifactory.com/money-talks-how-ai-helps-us-classify-our-expenses-and-income/)
- CSV import failures: [Flatfile — 6 Common CSV Import Errors](https://flatfile.com/blog/top-6-csv-import-errors-and-how-to-fix-them/); [Stop Writing Bank Statement Parsers — Use LLMs Instead](https://medium.com/@mahmudulhoque/stop-writing-bank-statement-parsers-use-llms-instead-50902360a604)
- Multi-tenant data isolation: [Actual Budget — Joint Accounts Strategy](https://actualbudget.org/docs/budgeting/joint-accounts/)
- Next.js App Router pitfalls: [Vercel — Common Mistakes with the Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them); [imidef — App Router Pitfalls 2026](https://imidef.com/en/2026-02-11-app-router-pitfalls)
- Google OAuth token handling: [Google — Using OAuth 2.0 Best Practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices); [Nango — Google OAuth Invalid Grant](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked)
- Finance app churn / UX mistakes: [Netguru — Mistakes in Creating Finance App](https://www.netguru.com/blog/mistakes-in-creating-finance-app)
- Budget timezone bugs: [Goodbudget — Time Zone Support](https://goodbudget.com/blog/2017/04/fixes-make-goodbudget-better-time-zone-support/)
- Misleading charts: [ThoughtSpot — How to Identify Misleading Graphs](https://www.thoughtspot.com/data-trends/data-visualization/how-to-identify-misleading-graphs-and-charts)

---

*Pitfalls research for: Personal Household Finance App (Next.js, NOK, multi-user)*
*Researched: 2026-02-18*
