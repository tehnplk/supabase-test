"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { success?: true; error?: string };

const parseNumber = (value: FormDataEntryValue | null, fallback = 0) => {
  const num = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(num) ? num : fallback;
};

const isValidDate = (value: string | null): value is string => {
  if (!value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
};

export async function upsertActivity(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "not_authenticated" };

  const id = (formData.get("id") as string | null) || null;
  const activity_type = (formData.get("activity_type") as string | null)?.trim();
  const distance_km = parseNumber(formData.get("distance_km"));
  const duration_minutes = parseNumber(formData.get("duration_minutes"));
  const calories = parseNumber(formData.get("calories"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const occurred_at_raw = formData.get("occurred_at") as string | null;
  const occurred_at = isValidDate(occurred_at_raw)
    ? new Date(occurred_at_raw!).toISOString()
    : new Date().toISOString();

  if (!activity_type) {
    return { error: "activity_type_required" };
  }

  const payload = {
    member_id: user.id,
    activity_type,
    distance_km,
    duration_minutes,
    calories,
    notes,
    occurred_at,
  };

  let error;
  if (id) {
    // Update
    const { error: updateError } = await supabase
      .from("member_activity")
      .update(payload)
      .eq("id", id)
      .eq("member_id", user.id); // Extra safety
    error = updateError;
  } else {
    // Insert
    const { error: insertError } = await supabase
      .from("member_activity")
      .insert(payload);
    error = insertError;
  }

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "not_authenticated" };

  const { error } = await supabase
    .from("member_activity")
    .delete()
    .eq("id", id)
    .eq("member_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/");
  return { success: true };
}
