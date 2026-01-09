import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import ActivityManager from "./activity-manager";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware enforces authentication; non-null assertion keeps types aligned.
  const currentUser = user!;

  const [{ data: member }, { data: activities }] = await Promise.all([
    supabase
      .from("members")
      .select("email, full_name, avatar_url, updated_at, status")
      .eq("id", currentUser.id)
      .maybeSingle(),
    supabase
      .from("member_activity")
      .select(
        "id, activity_type, distance_km, duration_minutes, calories, occurred_at, notes"
      )
      .eq("member_id", currentUser.id)
      .order("occurred_at", { ascending: false })
      .limit(50),
  ]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleString();
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return Number(value).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Account</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as <span className="font-medium">{currentUser.email}</span>
            </p>
          </div>

          <form action={signOut}>
            <button className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900">
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Profile</h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Full name
              </dt>
              <dd className="mt-1 text-sm">{member?.full_name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Email
              </dt>
              <dd className="mt-1 text-sm">{member?.email ?? currentUser.email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Avatar
              </dt>
              <dd className="mt-1 text-sm">
                {member?.avatar_url ? (
                  <a className="underline" href={member.avatar_url}>
                    {member.avatar_url}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Status
              </dt>
              <dd className="mt-1 text-sm capitalize">{member?.status ?? "-"}</dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            members row is protected by RLS; you only see your own.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <ActivityManager activities={activities ?? []} />
        </div>

        <p className="mt-8 text-sm">
          <Link className="underline" href="/">
            Go home
          </Link>
        </p>
      </div>
    </div>
  );
}
