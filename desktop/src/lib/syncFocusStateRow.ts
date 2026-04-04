import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const FOCUS_ROW_ID = "demo-device";

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (client === undefined) client = createClient(url, key);
  return client;
}

/** No-op if env is missing; logs warning on Supabase error (does not throw). */
export async function setFocusStateActive(active: boolean): Promise<void> {
  const sb = getClient();
  if (!sb) return;
  const { error } = await sb
    .from("focus_state")
    .update({ focus_active: active })
    .eq("id", FOCUS_ROW_ID);
  if (error) console.warn("[focus_state]", error.message);
}
