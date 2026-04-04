import { isDemoRootlyActionItemId, markActionItemDone } from "@/lib/rootlyClient";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

type Body = { actionItemId?: string };

/** Marks a Rootly incident action item as done (sync from Breakpoint). */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json(
      { error: "Invalid JSON" },
      { status: 400, headers: corsHeaders },
    );
  }

  const actionItemId = String(body.actionItemId ?? "").trim();
  if (!actionItemId) {
    return Response.json(
      { error: "actionItemId required" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    if (isDemoRootlyActionItemId(actionItemId)) {
      return Response.json(
        { ok: true, demo: true },
        { headers: corsHeaders },
      );
    }
    await markActionItemDone(actionItemId);
    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, error: msg },
      { status: 502, headers: corsHeaders },
    );
  }
}
