# Feature Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add loan editing, opening balance for all account types with balance display, calendar year toggle, crypto savings accounts with live prices, and confirmation dialogs on all loan delete actions.

**Architecture:** Each feature is self-contained. Tasks ordered by ascending complexity — cheap wins first (calendar, delete confirmations), then account balance refactor, then loan editing, then crypto which requires a DB migration. No breaking changes to existing data.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, Neon PostgreSQL, react-day-picker v9, CoinGecko public API (no key required), shadcn/ui AlertDialog

---

### Task 1: Calendar year/month dropdown

**Files:**
- Modify: `components/form-fields.tsx`

**Context:** The `CalendarField` component wraps shadcn's `Calendar` (react-day-picker v9). Adding `captionLayout="dropdown"` + `fromYear`/`toYear` props enables year and month dropdowns above the grid. This affects every date picker in the app at once.

**Step 1: Open `components/form-fields.tsx` and find the `<Calendar>` component (~line 85)**

It currently renders:
```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={(d) => { setDate(d); setOpen(false); }}
  locale={nb}
  initialFocus
/>
```

**Step 2: Add year/month dropdown props**

```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={(d) => { setDate(d); setOpen(false); }}
  locale={nb}
  initialFocus
  captionLayout="dropdown"
  fromYear={2000}
  toYear={new Date().getFullYear() + 10}
/>
```

**Step 3: Verify in dev**

Run: `npm run dev`
Open any form with a date picker (e.g. `/expenses/new`). The calendar should now show month and year dropdowns above the grid instead of just left/right arrows.

**Step 4: Commit**

```bash
git add components/form-fields.tsx
git commit -m "feat: add year/month dropdown to all calendar pickers"
```

---

### Task 2: Loan delete confirmations

**Files:**
- Modify: `app/(app)/loans/[id]/page.tsx`

**Context:** The loan detail page has two plain form-submit buttons with no confirmation: "Slett lån" (deletes the whole loan) and per-row "Slett" (deletes a payment). Both need to be wrapped in `AlertDialog`. The pattern used everywhere else in the app is `AlertDialog > AlertDialogTrigger > button` + `AlertDialogContent` with Cancel and a red Confirm.

The `deleteLoan` and `deleteLoanPayment` are imported server actions — they currently live inside inline `"use server"` forms. Convert each to use the existing imported actions.

**Step 1: Add AlertDialog imports at top of `app/(app)/loans/[id]/page.tsx`**

The page is a server component — the AlertDialog wrappers need to be client components. Create a small client component file:

Create: `app/(app)/loans/[id]/loan-delete-buttons.tsx`

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteLoan, deleteLoanPayment } from "../actions";

export function DeleteLoanButton({ loanId }: { loanId: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Slett lån
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett lån</AlertDialogTitle>
          <AlertDialogDescription>
            Er du sikker på at du vil slette dette lånet? Alle registrerte betalinger vil også slettes. Denne handlingen kan ikke angres.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <form action={deleteLoan.bind(null, loanId)}>
            <AlertDialogAction type="submit" className="bg-red-600 hover:bg-red-700">
              Slett
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeletePaymentButton({
  paymentId,
  loanId,
}: {
  paymentId: string;
  loanId: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Slett
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett betaling</AlertDialogTitle>
          <AlertDialogDescription>
            Er du sikker på at du vil slette denne betalingen?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <form action={deleteLoanPayment.bind(null, paymentId, loanId)}>
            <AlertDialogAction type="submit" className="bg-red-600 hover:bg-red-700">
              Slett
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Update `app/(app)/loans/[id]/page.tsx`**

- Remove the inline `<form action={async () => { "use server"; await deleteLoan(id); }}>` block
- Replace with `<DeleteLoanButton loanId={id} />`
- In the payments table, replace each inline delete form with `<DeletePaymentButton paymentId={p.id} loanId={id} />`
- Add import: `import { DeleteLoanButton, DeletePaymentButton } from "./loan-delete-buttons";`
- Remove the now-unused `deleteLoan, deleteLoanPayment` imports from `"../actions"` (they're used inside the client component now)

**Step 3: Verify in dev**

Navigate to `/loans/[id]`. Clicking "Slett lån" should show the confirmation dialog. Same for payment delete buttons.

**Step 4: Commit**

```bash
git add app/(app)/loans/[id]/loan-delete-buttons.tsx app/(app)/loans/[id]/page.tsx
git commit -m "feat: add confirmation dialogs for loan and payment deletion"
```

---

### Task 3: Opening balance for all account types

**Files:**
- Modify: `app/(app)/accounts/accounts-client.tsx`

**Context:** Opening balance fields (amount + date) currently only show when `newKind === "savings"` or `editKind === "savings"`. The server action already accepts and saves opening balance for any account type. Just remove the kind condition so the fields always render.

**Step 1: In `accounts-client.tsx`, find and remove the two `{newKind === "savings" && (` conditions**

The new-account form has:
```tsx
{newKind === "savings" && (
  <>
    <div className="space-y-1.5">
      <Label htmlFor="newOpeningBalance">Inngående saldo (NOK)</Label>
      ...
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="newOpeningBalanceDate">Per dato</Label>
      ...
    </div>
  </>
)}
```

Remove the wrapping `{newKind === "savings" && (` and `)}` — keep the two inner `<div>`s unconditionally.

**Step 2: Same for the edit form — remove the `{editKind === "savings" && (` condition**

The edit form has a similar block for `editKind === "savings"`. Remove the condition wrapper, keep the fields.

**Step 3: Verify**

Open `/accounts`. Click "Ny konto". Opening balance fields should always be visible regardless of account type. Same when editing.

**Step 4: Commit**

```bash
git add app/(app)/accounts/accounts-client.tsx
git commit -m "feat: show opening balance fields for all account types"
```

---

### Task 4: Balance display on accounts page

**Files:**
- Modify: `app/(app)/accounts/page.tsx`
- Modify: `app/(app)/accounts/accounts-client.tsx`

**Context:** For each account, balance = `openingBalanceOere` (or 0) + sum of income linked to that account − sum of expenses linked to that account. If an `openingBalanceDate` is set, only count transactions on or after that date. Show the balance in the account list. If an account has no opening balance AND no transactions, show `—` to avoid misleading zeros.

**Step 1: Update `app/(app)/accounts/page.tsx` to compute balances**

After the existing accounts query, add balance computation. Import `incomeEntries` from schema. Add these queries:

```ts
import { gte, sql } from "drizzle-orm";
import { accounts, incomeEntries, expenses, users } from "@/db/schema";

// After fetching `rows`, compute balances
const accountIds = rows.map((r) => r.id);
const balanceMap: Record<string, number | null> = {};

if (accountIds.length > 0 && householdId) {
  for (const account of rows) {
    const fromDate = account.openingBalanceDate ?? null;

    const [incRow] = await db
      .select({ total: sql<number>`coalesce(sum(${incomeEntries.amountOere}), 0)::int` })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.householdId, householdId),
          isNull(incomeEntries.deletedAt),
          eq(incomeEntries.accountId, account.id),
          ...(fromDate ? [gte(incomeEntries.date, fromDate)] : []),
        ),
      );

    const [expRow] = await db
      .select({ total: sql<number>`coalesce(sum(${expenses.amountOere}), 0)::int` })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, householdId),
          isNull(expenses.deletedAt),
          eq(expenses.accountId, account.id),
          ...(fromDate ? [gte(expenses.date, fromDate)] : []),
        ),
      );

    const inc = incRow?.total ?? 0;
    const exp = expRow?.total ?? 0;
    const hasActivity = account.openingBalanceOere != null || inc > 0 || exp > 0;

    balanceMap[account.id] = hasActivity
      ? (account.openingBalanceOere ?? 0) + inc - exp
      : null;
  }
}
```

Pass `balanceMap` to `AccountsClient` as a `balances` prop.

**Step 2: Update `AccountsClientProps` and the component signature**

Add to the interface:
```ts
balances: Record<string, number | null>;
```

**Step 3: Add balance display in the account list row**

In the JSX for each account row, after the name/accountNumber block, add:
```tsx
<div className="ml-auto text-sm font-medium tabular-nums">
  {balances[account.id] != null ? (
    <span className={balances[account.id]! >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
      {formatNOK(balances[account.id]!)}
    </span>
  ) : (
    <span className="text-foreground/30">—</span>
  )}
</div>
```

Import `formatNOK` from `@/lib/format`.

**Step 4: Pass `balanceMap` from page to client**

In `page.tsx`:
```tsx
<AccountsClient
  accounts={rows}
  currentUserId={user.id as string}
  balances={balanceMap}
/>
```

**Step 5: Verify**

Open `/accounts`. Each account row should show its computed balance on the right. Accounts with no activity show `—`.

**Step 6: Commit**

```bash
git add app/(app)/accounts/page.tsx app/(app)/accounts/accounts-client.tsx
git commit -m "feat: show computed balance for all accounts on accounts page"
```

---

### Task 5: Loan editing — server action

**Files:**
- Modify: `app/(app)/loans/actions.ts`

**Context:** Add an `updateLoan` server action with the same validation as `createLoan`. It updates the existing loan record in-place. After update it redirects to `/loans/[id]`.

**Step 1: Add `updateLoan` to `app/(app)/loans/actions.ts`**

Add import `logUpdate` from `@/lib/audit`. Then add after `createLoan`:

```ts
export async function updateLoan(
  loanId: string,
  _prevState: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  await validateCsrfOrigin();
  const user = await verifySession();
  if (!user.id) return { error: "User ID not available" };

  try {
    checkRateLimit(`loan:update:${user.id}`, 10, 3600);
  } catch {
    return { error: "Too many requests. Please try again later." };
  }

  const householdId = await getHouseholdId(user.id);
  if (!householdId) return { error: "Ingen husholdning funnet" };

  // AUTHORIZATION: verify loan belongs to this household and user
  const [existing] = await db
    .select({ id: loans.id })
    .from(loans)
    .where(
      and(
        eq(loans.id, loanId),
        eq(loans.householdId, householdId),
        eq(loans.userId, user.id),
        isNull(loans.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return { error: "Lån ikke funnet" };

  const raw = {
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    principal: formData.get("principal") as string,
    interestRate: formData.get("interestRate") as string,
    termMonths: formData.get("termMonths") as string,
    startDate: formData.get("startDate") as string,
    accountId: (formData.get("accountId") as string) || undefined,
    openingBalance: (formData.get("openingBalance") as string) || undefined,
    openingBalanceDate: (formData.get("openingBalanceDate") as string) || undefined,
  };

  const parsed = LoanSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: extractFieldErrors(parsed.error) };

  let principalOere: number;
  try {
    principalOere = nokToOere(parsed.data.principal);
  } catch {
    return { fieldErrors: { principal: ["Ugyldig beløp"] } };
  }

  const interestRate = Number.parseFloat(parsed.data.interestRate.replace(",", "."));
  if (Number.isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
    return { fieldErrors: { interestRate: ["Rente må være mellom 0 og 100 prosent"] } };
  }
  const roundedRate = Math.round(interestRate * 100) / 100;
  if (interestRate !== roundedRate) {
    return { fieldErrors: { interestRate: ["Rente må ha maks 2 desimaler (f.eks. 3,50%)"] } };
  }

  const termMonths = Number.parseInt(parsed.data.termMonths, 10);
  if (Number.isNaN(termMonths) || termMonths <= 0) {
    return { fieldErrors: { termMonths: ["Ugyldig løpetid"] } };
  }

  let openingBalanceOere: number | null = null;
  const openingBalanceDate: string | null = parsed.data.openingBalanceDate || null;

  if (parsed.data.openingBalance || openingBalanceDate) {
    if (!parsed.data.openingBalance || !openingBalanceDate) {
      return { fieldErrors: { openingBalance: ["Både restgjeld og dato må fylles ut sammen"] } };
    }
    if (openingBalanceDate < parsed.data.startDate) {
      return { fieldErrors: { openingBalanceDate: ["Dato må være lik eller etter startdato"] } };
    }
    try {
      openingBalanceOere = nokToOere(parsed.data.openingBalance);
    } catch {
      return { fieldErrors: { openingBalance: ["Ugyldig beløp"] } };
    }
  }

  await db
    .update(loans)
    .set({
      name: parsed.data.name,
      type: parsed.data.type as typeof loans.$inferInsert.type,
      principalOere,
      interestRate,
      termMonths,
      startDate: parsed.data.startDate,
      accountId: parsed.data.accountId ?? null,
      openingBalanceOere,
      openingBalanceDate,
    })
    .where(
      and(eq(loans.id, loanId), eq(loans.householdId, householdId), eq(loans.userId, user.id)),
    );

  await logUpdate(householdId, user.id, "loan", loanId, { principalOere, interestRate, termMonths });

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/loans");
  redirect(`/loans/${loanId}`);
}
```

**Step 2: Add `logUpdate` import**

At the top of `actions.ts`, change:
```ts
import { logCreate, logDelete } from "@/lib/audit";
```
to:
```ts
import { logCreate, logDelete, logUpdate } from "@/lib/audit";
```

**Step 3: Commit**

```bash
git add app/(app)/loans/actions.ts
git commit -m "feat: add updateLoan server action"
```

---

### Task 6: Loan editing — edit page and button

**Files:**
- Create: `app/(app)/loans/[id]/edit/page.tsx`
- Modify: `app/(app)/loans/[id]/page.tsx`

**Context:** The edit page fetches the existing loan, pre-fills `LoanForm`, and binds `updateLoan`. Add an "Rediger" button on the detail page alongside the delete button.

**Step 1: Create `app/(app)/loans/[id]/edit/page.tsx`**

```tsx
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { accounts, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { LoanForm } from "../../loan-form";
import { updateLoan } from "../../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditLoanPage({ params }: Props) {
  const { id } = await params;
  const user = await verifySession();
  const householdId = await getHouseholdId(user.id as string);
  if (!householdId) notFound();

  const [loan] = await db
    .select()
    .from(loans)
    .where(
      and(
        eq(loans.id, id),
        eq(loans.householdId, householdId),
        eq(loans.userId, user.id as string),
        isNull(loans.deletedAt),
      ),
    )
    .limit(1);

  if (!loan) notFound();

  const accountOptions = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(
      and(
        eq(accounts.householdId, householdId),
        isNull(accounts.deletedAt),
      ),
    );

  const action = updateLoan.bind(null, id);

  return (
    <div className="p-4 sm:p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
          Rediger lån
        </h1>
        <p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
          {loan.name}
        </p>
      </div>
      <LoanForm
        action={action}
        defaultName={loan.name}
        defaultType={loan.type}
        defaultPrincipalNOK={String(loan.principalOere / 100)}
        defaultInterestRate={String(loan.interestRate)}
        defaultTermMonths={String(loan.termMonths)}
        defaultStartDate={new Date(loan.startDate)}
        defaultAccountId={loan.accountId ?? undefined}
        defaultOpeningBalanceNOK={loan.openingBalanceOere != null ? String(loan.openingBalanceOere / 100) : undefined}
        defaultOpeningBalanceDate={loan.openingBalanceDate ? new Date(loan.openingBalanceDate) : undefined}
        accounts={accountOptions}
        submitLabel="Lagre endringer"
        cancelHref={`/loans/${id}`}
      />
    </div>
  );
}
```

**Step 2: Add edit button to `app/(app)/loans/[id]/page.tsx`**

Find the header section with the existing delete button:
```tsx
<form action={async () => { "use server"; await deleteLoan(id); }}>
  <button type="submit" className="...">Slett lån</button>
</form>
```

Replace with (after Task 2 the delete is now `<DeleteLoanButton>`):
```tsx
<div className="flex items-center gap-2">
  <a
    href={`/loans/${id}/edit`}
    className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-card dark:border-border/40 dark:text-foreground/60 dark:hover:bg-card/50"
  >
    Rediger
  </a>
  <DeleteLoanButton loanId={id} />
</div>
```

**Step 3: Verify**

Navigate to a loan. You should see "Rediger" next to "Slett lån". Clicking "Rediger" opens the pre-filled form. Submitting saves changes and redirects back to the loan detail page.

**Step 4: Commit**

```bash
git add app/(app)/loans/[id]/edit/page.tsx app/(app)/loans/[id]/page.tsx
git commit -m "feat: add loan edit page and button"
```

---

### Task 7: Crypto accounts — DB migration

**Files:**
- Create: `db/migrations/0008_crypto_accounts.sql`
- Modify: `db/schema.ts`

**Context:** Add two nullable columns to `accounts`: `coin_symbol text` (e.g. "BTC") and `coin_quantity double_precision`. Only populated when `kind = 'crypto'`. Also add `'crypto'` to the valid kinds — but since `kind` is a plain `text` column (not an enum), no enum migration is needed.

**Step 1: Create migration file `db/migrations/0008_crypto_accounts.sql`**

```sql
ALTER TABLE "accounts" ADD COLUMN "coin_symbol" text;
ALTER TABLE "accounts" ADD COLUMN "coin_quantity" double precision;
```

**Step 2: Update `db/schema.ts` — add the two columns to the `accounts` table**

After `openingBalanceDate`:
```ts
coinSymbol: text("coin_symbol"),
coinQuantity: doublePrecision("coin_quantity"),
```

`doublePrecision` is already imported from `drizzle-orm/pg-core` (check — if not, add it to the import).

**Step 3: Run migration locally (if running Neon locally) or confirm it will apply on restart**

The app applies migrations on startup via `ALLOW_MIGRATE=true`. On next deploy/restart the migration will run automatically.

**Step 4: Commit**

```bash
git add db/migrations/0008_crypto_accounts.sql db/schema.ts
git commit -m "feat: add coin_symbol and coin_quantity columns to accounts"
```

---

### Task 8: Crypto accounts — account form UI

**Files:**
- Modify: `app/(app)/accounts/accounts-client.tsx`
- Modify: `app/(app)/accounts/actions.ts`

**Context:** When `kind === "crypto"`, replace the NOK opening balance field with a coin selector + quantity field. The coin symbol and quantity are saved to the new DB columns. The regular `openingBalanceOere` / `openingBalanceDate` fields are hidden for crypto accounts.

**Supported coins** (symbol → CoinGecko ID):
```ts
const COINS = [
  { symbol: "BTC", name: "Bitcoin", geckoId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", geckoId: "ethereum" },
  { symbol: "SOL", name: "Solana", geckoId: "solana" },
  { symbol: "ADA", name: "Cardano", geckoId: "cardano" },
  { symbol: "XRP", name: "XRP", geckoId: "ripple" },
  { symbol: "DOT", name: "Polkadot", geckoId: "polkadot" },
  { symbol: "LINK", name: "Chainlink", geckoId: "chainlink" },
  { symbol: "MATIC", name: "Polygon", geckoId: "matic-network" },
] as const;
```

**Step 1: Add state for crypto fields in `AccountsClient`**

Add to existing state variables:
```ts
const [newCoinSymbol, setNewCoinSymbol] = useState("BTC");
const [newCoinQuantity, setNewCoinQuantity] = useState("");
const [editCoinSymbol, setEditCoinSymbol] = useState("BTC");
const [editCoinQuantity, setEditCoinQuantity] = useState("");
```

Add to reset in `handleCreate` success block:
```ts
setNewCoinSymbol("BTC");
setNewCoinQuantity("");
```

In `startEdit`, populate:
```ts
setEditCoinSymbol(account.coinSymbol ?? "BTC");
setEditCoinQuantity(account.coinQuantity != null ? String(account.coinQuantity) : "");
```

**Step 2: Add `coinQuantityError` validation helper** (alongside `accountNumberError`):

```ts
function coinQuantityError(value: string): string | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(",", "."));
  if (Number.isNaN(n) || n <= 0) return "Ugyldig mengde";
  return null;
}
```

Add to computed errors:
```ts
const newCoinQuantityErr = newKind === "crypto" ? coinQuantityError(newCoinQuantity) : null;
const editCoinQuantityErr = editKind === "crypto" ? coinQuantityError(editCoinQuantity) : null;
```

Update `newFormValid` and `editFormValid`:
```ts
const newFormValid = !newAccountNumberErr && !newOpeningBalanceErr && !newCoinQuantityErr;
const editFormValid = !editAccountNumberErr && !editOpeningBalanceErr && !editCoinQuantityErr;
```

**Step 3: Pass crypto fields to server actions**

In `handleCreate`, add `newCoinSymbol` and `newCoinQuantity` to the `createAccount` call (new optional parameters — see Task 8 Step 5).

In `handleUpdate`, pass `editCoinSymbol` and `editCoinQuantity`.

**Step 4: Replace the opening balance fields block for crypto in the new-account form**

Change:
```tsx
{/* opening balance fields — always shown */}
<div className="space-y-1.5">
  <Label htmlFor="newOpeningBalance">Inngående saldo (NOK)</Label>
  ...
</div>
<div className="space-y-1.5">
  <Label htmlFor="newOpeningBalanceDate">Per dato</Label>
  ...
</div>
```

To:
```tsx
{newKind === "crypto" ? (
  <>
    <div className="space-y-1.5">
      <Label htmlFor="newCoinSymbol">Kryptovaluta</Label>
      <select
        id="newCoinSymbol"
        value={newCoinSymbol}
        onChange={(e) => setNewCoinSymbol(e.target.value)}
        className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-border/40 dark:bg-card dark:text-card-foreground"
      >
        {COINS.map((c) => (
          <option key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</option>
        ))}
      </select>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="newCoinQuantity">Antall {newCoinSymbol}</Label>
      <Input
        id="newCoinQuantity"
        value={newCoinQuantity}
        onChange={(e) => setNewCoinQuantity(e.target.value)}
        placeholder="0.00"
        inputMode="decimal"
        className={`max-w-xs ${newCoinQuantityErr ? "border-red-400 focus-visible:ring-red-400" : ""}`}
      />
      {newCoinQuantityErr && <p className="text-xs text-red-500">{newCoinQuantityErr}</p>}
    </div>
  </>
) : (
  <>
    {/* existing opening balance NOK + date fields */}
    ...
  </>
)}
```

Apply the same pattern in the edit form.

**Step 5: Update `accounts-client.tsx` AccountRow interface**

Add:
```ts
coinSymbol: string | null;
coinQuantity: number | null;
```

**Step 6: Update `app/(app)/accounts/actions.ts` — `createAccount` and `updateAccount`**

Add two optional params to `createAccount`:
```ts
coinSymbol?: string,
coinQuantity?: string,
```

In the insert values, add:
```ts
coinSymbol: kind === "crypto" ? (coinSymbol ?? "BTC") : null,
coinQuantity: kind === "crypto" && coinQuantity ? Number(coinQuantity.replace(",", ".")) : null,
```

Add validation for crypto:
```ts
if (kind === "crypto") {
  if (!coinQuantity?.trim()) return "Antall coins er påkrevd for krypto-konto";
  const qty = Number(coinQuantity.replace(",", "."));
  if (Number.isNaN(qty) || qty <= 0) return "Ugyldig mengde";
}
```

Apply same changes to `updateAccount`.

**Step 7: Update `app/(app)/accounts/page.tsx` to select the new columns**

The existing query uses `db.select({...}).from(accounts)`. Add `coinSymbol` and `coinQuantity` to the selected fields.

**Step 8: Add `"crypto"` to `VALID_KINDS` in `actions.ts`**

```ts
const VALID_KINDS = ["checking", "savings", "credit", "investment", "crypto"] as const;
```

**Step 9: Add "Krypto" option to the kind `<select>` in the new-account and edit forms in `accounts-client.tsx`**

```tsx
<option value="crypto">Krypto</option>
```

**Step 10: Verify**

Create a new account with kind "Krypto". Select BTC, enter a quantity. Save. Account should appear in list.

**Step 11: Commit**

```bash
git add app/(app)/accounts/accounts-client.tsx app/(app)/accounts/actions.ts app/(app)/accounts/page.tsx
git commit -m "feat: add crypto account type with coin selector and quantity"
```

---

### Task 9: Crypto accounts — live prices on savings page

**Files:**
- Modify: `app/(app)/savings/page.tsx`
- Modify: `app/(app)/savings/savings-account-card.tsx`

**Context:** On the savings page, crypto accounts (kind === "crypto") need their balance computed as `coinQuantity × live NOK price` instead of `openingBalanceOere + transactions`. Fetch prices from CoinGecko's free public API: `https://api.coingecko.com/api/v3/simple/price?ids=<comma-joined-gecko-ids>&vs_currencies=nok`. If the fetch fails, fall back to showing quantity only.

**Step 1: Create a coin map and fetch helper at top of `app/(app)/savings/page.tsx`**

```ts
const COIN_GECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
};

async function fetchCoinPricesNOK(symbols: string[]): Promise<Record<string, number>> {
  const geckoIds = [...new Set(symbols.map((s) => COIN_GECKO_IDS[s]).filter(Boolean))];
  if (geckoIds.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(",")}&vs_currencies=nok`,
      { next: { revalidate: 300 } }, // cache 5 minutes
    );
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, number> = {};
    for (const [symbol, geckoId] of Object.entries(COIN_GECKO_IDS)) {
      if (data[geckoId]?.nok) result[symbol] = data[geckoId].nok;
    }
    return result;
  } catch {
    return {};
  }
}
```

**Step 2: Update savings account query to include `kind`, `coinSymbol`, `coinQuantity`**

The current query uses `db.select().from(accounts)...` — add `kind`, `coinSymbol`, `coinQuantity` to the select, or use `select()` with explicit fields including the new columns.

**Step 3: Fetch prices before computing balances**

After fetching savings accounts, collect crypto coin symbols and fetch prices:

```ts
const cryptoSymbols = savingsAccounts
  .filter((a) => a.kind === "crypto" && a.coinSymbol)
  .map((a) => a.coinSymbol as string);

const coinPrices = await fetchCoinPricesNOK(cryptoSymbols);
```

**Step 4: Branch balance computation for crypto accounts**

In the balance computation loop:
```ts
for (const account of savingsAccounts) {
  if (account.kind === "crypto") {
    const price = account.coinSymbol ? (coinPrices[account.coinSymbol] ?? null) : null;
    balances[account.id] = price != null && account.coinQuantity != null
      ? Math.round(account.coinQuantity * price * 100) // to øre
      : 0;
    // mark as having live price or not
    cryptoPriceAvailable[account.id] = price != null;
    continue;
  }
  // ... existing transaction-based computation
}
```

Declare `const cryptoPriceAvailable: Record<string, boolean> = {};` before the loop.

**Step 5: Pass crypto metadata to `SavingsAccountCard`**

Update props passed to the card:
```tsx
<SavingsAccountCard
  ...
  coinSymbol={account.coinSymbol ?? undefined}
  coinQuantity={account.coinQuantity ?? undefined}
  livePriceAvailable={account.kind === "crypto" ? (cryptoPriceAvailable[account.id] ?? false) : undefined}
/>
```

**Step 6: Update `SavingsAccountCard` to show crypto info**

Add to `SavingsAccountCardProps`:
```ts
coinSymbol?: string;
coinQuantity?: number;
livePriceAvailable?: boolean;
```

In the header section, when `coinSymbol` is set, add a badge and quantity line:
```tsx
{coinSymbol && (
  <div className="flex items-center gap-1.5 mt-0.5">
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      {coinSymbol}
    </span>
    {coinQuantity != null && (
      <span className="text-xs text-foreground/50">
        {coinQuantity} {coinSymbol}
      </span>
    )}
  </div>
)}
```

Replace `!hasOpeningBalance` warning for crypto accounts:
```tsx
{coinSymbol && livePriceAvailable === false && (
  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
    Live kurs ikke tilgjengelig. Sjekk internettforbindelsen.
  </p>
)}
{!coinSymbol && !hasOpeningBalance && (
  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
    Saldo beregnes fra alle importerte transaksjoner. Sett inngående saldo for korrekt beregning.
  </p>
)}
```

**Step 7: Verify**

Create a crypto savings account (BTC, 0.5). Navigate to `/savings`. The card should show "0.5 BTC" and the live NOK balance. If CoinGecko is down, shows 0 with the "not available" note.

**Step 8: Commit**

```bash
git add app/(app)/savings/page.tsx app/(app)/savings/savings-account-card.tsx
git commit -m "feat: show live NOK balance for crypto savings accounts via CoinGecko"
```

---

### Task 10: Final verification

**Step 1: Check TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Fix any type errors before considering done.

**Step 2: Build check**

```bash
npm run build
```

Expected: clean build, no errors.

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: type and build errors after feature implementation"
```
