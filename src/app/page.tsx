import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: summary } = await supabase.rpc("member_activity_summary");
  const { data: recent } = await supabase.rpc("recent_member_activities", {
    limit_rows: 5,
  });

  const totals = summary?.[0];
  const byTypeEntries = totals?.by_type
    ? Object.entries(totals.by_type as Record<string, number>)
    : [];

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleString();
  };

  const formatNum = (value: number) => value.toFixed(2);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight">Fitness overview</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">System-wide activity summary.</p>
          </div>
          <div className="flex gap-3">
            {user ? (
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                href="/account"
              >
                Account
              </Link>
            ) : (
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                href="/login"
              >
                Sign in
              </Link>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Members"
            value={(totals?.total_members ?? 0).toString()}
          />
          <StatCard
            label="Activities"
            value={(totals?.total_activities ?? 0).toString()}
          />
          <StatCard
            label="Distance (km)"
            value={formatNum(Number(totals?.total_distance ?? 0))}
          />
          <StatCard
            label="Calories"
            value={formatNum(Number(totals?.total_calories ?? 0))}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
            <h2 className="text-lg font-semibold">Recent activities</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Distance</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2 pr-4">Calories</th>
                    <th className="pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(recent ?? []).map((a: any, idx: number) => (
                    <tr key={`${a.activity_type}-${a.occurred_at}-${idx}`}>
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDate(a.occurred_at)}</td>
                      <td className="py-2 pr-4 capitalize">{a.activity_type}</td>
                      <td className="py-2 pr-4">{formatNum(Number(a.distance_km ?? 0))}</td>
                      <td className="py-2 pr-4">{formatNum(Number(a.duration_minutes ?? 0))}</td>
                      <td className="py-2 pr-4">{formatNum(Number(a.calories ?? 0))}</td>
                      <td className="py-2">{a.notes ?? "-"}</td>
                    </tr>
                  ))}
                  {(!recent || recent.length === 0) && (
                    <tr>
                      <td className="py-3 text-sm text-zinc-500 dark:text-zinc-400" colSpan={6}>
                        No activities yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Activity mix</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {byTypeEntries.length > 0 ? (
                byTypeEntries.map(([type, count]) => (
                  <li key={type} className="flex items-center justify-between capitalize">
                    <span>{type}</span>
                    <span className="font-medium">{count as number}</span>
                  </li>
                ))
              ) : (
                <li className="text-zinc-500 dark:text-zinc-400">No activities yet.</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
