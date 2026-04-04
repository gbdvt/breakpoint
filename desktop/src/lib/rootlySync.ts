/**
 * Rootly ↔ Breakpoint via Next.js API (never put ROOTLY_API_KEY in the desktop app).
 */

const DEFAULT_NEXT_ORIGIN = "http://localhost:3000";

function apiOrigin(): string {
  const raw = import.meta.env.VITE_BREAKPOINT_API_ORIGIN?.trim() ?? "";
  if (raw) return raw.replace(/\/$/, "");
  return DEFAULT_NEXT_ORIGIN;
}

export type RootlyImportItem = {
  actionItemId: string;
  incidentId: string | null;
  title: string;
  description: string;
  priority: string | null;
  status: string;
  incidentTitle: string | null;
  incidentSeverity: string | null;
  estimateContext: string;
};

export async function importRootlyActionItems(): Promise<
  | {
      ok: true;
      items: RootlyImportItem[];
      mock?: boolean;
      incidentFallback?: boolean;
    }
  | { ok: false; error: string }
> {
  const origin = apiOrigin();
  try {
    const res = await fetch(`${origin}/api/rootly/import`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const data = (await res.json()) as {
      items?: RootlyImportItem[];
      error?: string;
      mock?: boolean;
      incidentFallback?: boolean;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return {
      ok: true,
      mock: data.mock === true,
      incidentFallback: data.incidentFallback === true,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function completeRootlyActionItem(
  actionItemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const origin = apiOrigin();
  try {
    const res = await fetch(`${origin}/api/rootly/complete`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actionItemId }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
