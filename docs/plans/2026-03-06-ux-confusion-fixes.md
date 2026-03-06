# UX Confusion Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 identified UX interaction confusions across the personal finance app.

**Architecture:** All fixes are additive UI changes — copy tweaks, new tooltips/banners, input type normalization, and small component updates. No data model or routing changes required.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Tooltip, AlertDialog), lucide-react icons.

---

## Task 1: Normalize amount input in RecurringForm

**Files:**
- Modify: `app/(app)/expenses/recurring/recurring-form.tsx:76-91`

**Step 1: Make the change**

In `RecurringForm`, change the amount `<Input>` from `type="number"` to `type="text"` with `inputMode` and `pattern` matching `ExpenseForm`:

```tsx
<Input
  id="amount"
  name="amount"
  type="text"
  inputMode="decimal"
  pattern="[0-9]*[.,]?[0-9]*"
  placeholder="0.00"
  defaultValue={defaultAmountNOK}
  className="h-9"
/>
```

Remove `step="0.01"` and `min="0"`.

**Step 2: Verify visually**

Navigate to `/expenses/recurring/new` and confirm the field accepts both `1234` and `1234,56` and `1234.56` without browser validation errors.

---

## Task 2: Update recurring template delete confirmation

**Files:**
- Modify: `app/(app)/expenses/recurring/page.tsx:190-197`

**Step 1: Make the change**

Update the `AlertDialogDescription` to clarify that existing entries are retained:

```tsx
<AlertDialogDescription>
  Er du sikker på at du vil slette «{template.description}»? Fremtidige
  utgifter vil ikke lenger genereres automatisk. Allerede genererte
  utgifter beholdes og må slettes manuelt.
</AlertDialogDescription>
```

---

## Task 3: Add explainer to import account selector

**Files:**
- Modify: `app/(app)/import/import-tabs.tsx:61-81`

**Step 1: Make the change**

After the `<select>` closing tag (around line 79), add a helper line:

```tsx
<p className="mt-1.5 text-xs text-foreground/50 dark:text-foreground/40">
  Dette er kontoen transaksjonene importeres til — ikke det samme som filteret øverst.
</p>
```

This goes inside the `<div className="mt-4 flex items-center gap-3">` wrapper — change it to `flex-col items-start` to accommodate the helper text:

```tsx
<div className="mt-4 flex flex-col gap-1.5">
  <div className="flex items-center gap-3">
    <label
      htmlFor="importAccount"
      className="text-sm font-medium text-foreground/80 dark:text-foreground/80"
    >
      Konto:
    </label>
    <select
      id="importAccount"
      value={selectedAccountId}
      onChange={(e) => setSelectedAccountId(e.target.value)}
      className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-border/40 dark:bg-card dark:text-card-foreground"
    >
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name} {a.type === "private" ? "(Privat)" : ""}
        </option>
      ))}
    </select>
  </div>
  <p className="text-xs text-foreground/50 dark:text-foreground/40">
    Dette er kontoen transaksjonene importeres til — ikke det samme som filteret øverst.
  </p>
</div>
```

---

## Task 4: Add loan-in-expenses footnote to dashboard

**Files:**
- Modify: `app/(app)/dashboard/dashboard-client.tsx:163-220`

**Step 1: Add footnote to Utgifter card**

After the `{formatNOK(totalExpenses)}` `<p>` tag in the Utgifter card, add:

```tsx
<p className="mt-0.5 text-xs text-foreground/50 dark:text-foreground/60">
  Inkluderer låneutgifter
</p>
```

**Step 2: Add footnote to loan card**

In the loan card section (around line 244), after the interest/principal breakdown line, add:

```tsx
<p className="mt-1 text-xs text-foreground/50 dark:text-foreground/60">
  Inkludert i utgifter over
</p>
```

---

## Task 5: Add tooltip to "Alle" chip in AccountSelector + private label

**Files:**
- Modify: `components/account-selector.tsx`

**Step 1: Import Tooltip components**

Add at the top of the file:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**Step 2: Wrap the "Alle" button in a Tooltip**

Replace the `<button type="button" aria-pressed={isAll} ...>Alle</button>` with:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-pressed={isAll}
        onClick={selectAll}
        className={`${chipBase} ${isAll ? chipActive : chipInactive}`}
      >
        Alle
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-[200px] text-center text-xs">
      Inkluderer kun delte kontoer. Klikk på private kontoer for å inkludere dem.
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Step 3: Add "Privat" section label before private accounts**

Replace the existing divider `<span className="h-5 w-px ...">` with:

```tsx
{privateAccounts.length > 0 && (
  <span className="flex items-center gap-1.5 flex-shrink-0">
    <span className="h-5 w-px bg-border/40" />
    <span className="text-xs text-foreground/40 select-none">Privat</span>
  </span>
)}
```

---

## Task 6: Add row tooltip and sheet label in ExpenseTable

**Files:**
- Modify: `app/(app)/expenses/expense-table.tsx`

**Step 1: Import Tooltip**

Add to imports:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**Step 2: Wrap the Pencil icon in a Tooltip**

In the `actions` column cell (around line 306-312), wrap the edit `<Button>` in a tooltip:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link
          href={`/expenses/${expense.id}/edit`}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-4 w-4 text-foreground/60" />
        </Link>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">Rediger</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Step 3: Add "Hurtigvisning" subtitle to the Sheet**

In the `<SheetHeader>` (around line 547), add a description under the title:

```tsx
<SheetHeader>
  <SheetTitle>Utgiftsdetaljer</SheetTitle>
  <p className="text-xs text-foreground/50">Hurtigvisning — klikk Rediger for å endre</p>
</SheetHeader>
```

---

## Task 7: Add "View existing expenses" link in duplicate warning

**Files:**
- Modify: `app/(app)/expenses/expense-form.tsx:86-110`

**Step 1: Extract the month from the expense date**

At the top of the duplicate warning `<div>`, compute the month link. The form has access to `defaultDate`. Add a helper derivation before the return:

```tsx
const duplicateMonthHref = useMemo(() => {
  const d = defaultDate ?? new Date();
  const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `/expenses?month=${m}`;
}, [defaultDate]);
```

This goes inside the `ExpenseForm` component body, after the existing `useMemo` for `selectedCategoryName`.

**Step 2: Add link to the duplicate warning block**

Inside the amber warning box, after the warning message paragraph (`<p className="mt-0.5">{state.warning}</p>`), add:

```tsx
<a
  href={duplicateMonthHref}
  target="_blank"
  rel="noreferrer"
  className="mt-1 inline-block text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
>
  Se eksisterende utgifter &rarr;
</a>
```

---

## Task 8: Month filter conflict banner in ExpenseTable

**Files:**
- Modify: `app/(app)/expenses/expense-table.tsx`

**Context:** The expense table reads `?month=` from URL params. The sidebar sets a `selectedMonth` cookie. When the URL param is present and differs from the cookie, the user is viewing a different month than the sidebar shows.

**Step 1: Read the cookie client-side**

At the top of the `ExpenseTable` component body, read the sidebar's cookie and compare:

```tsx
const cookieMonth = useMemo(() => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("selectedMonth="));
  return match ? match.split("=")[1] : null;
}, []);

const showMonthMismatchBanner =
  monthParam !== null &&
  cookieMonth !== null &&
  monthParam !== cookieMonth &&
  monthParam !== "all";
```

**Step 2: Render the banner above the filter bar**

Before the `{importBatchId && ...}` block (around line 367), add:

```tsx
{showMonthMismatchBanner && (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-900/20">
    <p className="text-sm text-amber-800 dark:text-amber-300">
      Viser{" "}
      <span className="font-semibold">
        {monthOptions.find((o) => o.value === monthParam)?.label ?? monthParam}
      </span>{" "}
      — avviker fra måneden valgt i sidepanelet.
    </p>
    <button
      type="button"
      onClick={() => updateParams({ month: null })}
      className="flex-shrink-0 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
    >
      Tilbakestill
    </button>
  </div>
)}
```

Note: `monthOptions` is already computed in the component. `updateParams` is already defined.

---
