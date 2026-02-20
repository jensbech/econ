import { verifySession } from "@/src/lib/dal";
import { signOut } from "@/src/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifySession();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      {/* Top Navigation */}
      <nav className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Jeg vil ha pengene mine!
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Navigation */}
      <div className="flex flex-1">
        <aside className="w-64 border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          <nav className="space-y-1 px-2 py-4">
            <a
              href="/dashboard"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Dashboard
            </a>
            <a
              href="/expenses"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Expenses
            </a>
            <a
              href="/income"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Income
            </a>
            <a
              href="/loans"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Loans
            </a>
            <a
              href="/savings"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Savings
            </a>
            <a
              href="/import"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Import
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
