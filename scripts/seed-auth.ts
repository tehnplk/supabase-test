import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SeedUser = {
  email: string;
  password: string;
  fullName: string;
  avatarUrl: string;
};

const USERS: SeedUser[] = [
  {
    email: "user1@example.com",
    password: "Password!234",
    fullName: "Somchai Saengdee",
    avatarUrl: "https://ui-avatars.com/api/?name=user1",
  },
  {
    email: "user2@example.com",
    password: "Password!234",
    fullName: "Somsri Rakthai",
    avatarUrl: "https://ui-avatars.com/api/?name=user2",
  },
  {
    email: "user3@example.com",
    password: "Password!234",
    fullName: "Wichai Meesook",
    avatarUrl: "https://ui-avatars.com/api/?name=user3",
  },
  {
    email: "user4@example.com",
    password: "Password!234",
    fullName: "Ananya Jaiyen",
    avatarUrl: "https://ui-avatars.com/api/?name=user4",
  },
  {
    email: "user5@example.com",
    password: "Password!234",
    fullName: "Kitti Panit",
    avatarUrl: "https://ui-avatars.com/api/?name=user5",
  },
];

const MEMBER_STATUS_ACTIVE = "active" as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function requireEnvAny(names: string[]): { name: string; value: string } {
  for (const name of names) {
    const value = process.env[name];
    if (value) return { name, value };
  }
  throw new Error(`Missing env: one of ${names.join(", ")}`);
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

async function listUsersByEmail(
  supabase: SupabaseClient,
  emails: Set<string>
): Promise<Map<string, { id: string; email: string }>> {
  const found = new Map<string, { id: string; email: string }>();

  let page = 1;
  const perPage = 200;

  while (found.size < emails.size) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users) {
      if (!user.email) continue;
      if (emails.has(user.email)) {
        found.set(user.email, { id: user.id, email: user.email });
      }
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return found;
}

async function main() {
  const reset = hasArg("--reset");

  const { value: url } = requireEnvAny([
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]);
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const emailSet = new Set(USERS.map((u) => u.email));

  if (reset) {
    const existing = await listUsersByEmail(supabase, emailSet);

    // Must delete members first because members.id references auth.users.id
    const { error: deleteMembersError } = await supabase
      .from("members")
      .delete()
      .in(
        "email",
        Array.from(emailSet.values())
      );
    if (deleteMembersError) throw deleteMembersError;

    for (const [, user] of existing) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteUserError) throw deleteUserError;
    }
  }

  const existingByEmail = await listUsersByEmail(supabase, emailSet);
  const userRows: Array<{
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    status: typeof MEMBER_STATUS_ACTIVE;
  }> = [];

  for (const u of USERS) {
    const existing = existingByEmail.get(u.email);

    if (!existing) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          full_name: u.fullName,
          avatar_url: u.avatarUrl,
        },
      });
      if (error) throw error;

      userRows.push({
        id: data.user.id,
        email: u.email,
        full_name: u.fullName,
        avatar_url: u.avatarUrl,
        status: MEMBER_STATUS_ACTIVE,
      });

      continue;
    }

    // Keep it idempotent: ensure metadata is updated even if user already exists.
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      user_metadata: {
        full_name: u.fullName,
        avatar_url: u.avatarUrl,
      },
      email_confirm: true,
      password: u.password,
    });
    if (updateError) throw updateError;

    userRows.push({
      id: existing.id,
      email: u.email,
      full_name: u.fullName,
      avatar_url: u.avatarUrl,
      status: MEMBER_STATUS_ACTIVE,
    });
  }

  // Service role bypasses RLS; upsert keeps it re-runnable.
  const { error: upsertError } = await supabase
    .from("members")
    .upsert(userRows, { onConflict: "id" });
  if (upsertError) throw upsertError;

  console.log("Seed complete.");
  console.log("Logins:");
  for (const u of USERS) {
    console.log(`- ${u.email} / ${u.password}`);
  }
  if (!reset) {
    console.log("Tip: run with --reset to recreate fresh users.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
