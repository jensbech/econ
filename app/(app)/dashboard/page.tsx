import { verifySession } from "@/src/lib/dal";

export default async function DashboardPage() {
  const user = await verifySession();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
        Dashboard
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Welcome, {user.name || user.email}!
      </p>
    </div>
  );
}
