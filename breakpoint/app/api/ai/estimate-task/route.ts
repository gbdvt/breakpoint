import { claudeJsonCompletion } from "@/lib/anthropicClient";

export const runtime = "nodejs";

type Body = {
  goal: string;
  mode: string;
  /** Optional; omit or 0 to avoid anchoring the model to a short default (e.g. 45). */
  plannedDurationMin?: number;
  /** Free-form notes: tools, lecture lengths, playback speed, distractors, study sites, etc. */
  taskContextNote?: string;
  /** Rootly incident action item context (severity, incident title, etc.). */
  rootlyContext?: string;
  profile?: {
    n: number;
    avgMin: number | null;
    avgDrift: number | null;
    avgPlanned: number | null;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

type Out = {
  minutesMin: number;
  minutesMax: number;
  oneLiner: string;
};

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

  const goal = String(body.goal ?? "").trim().slice(0, 500);
  if (!goal) {
    return Response.json(
      { error: "goal required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const mode = String(body.mode ?? "work").slice(0, 32);
  const plannedNum = Number(body.plannedDurationMin);
  const hasPlanned =
    body.plannedDurationMin != null &&
    Number.isFinite(plannedNum) &&
    plannedNum > 0;
  const planned = hasPlanned
    ? Math.min(480, Math.max(1, Math.round(plannedNum)))
    : null;
  const plannedLine =
    planned != null
      ? `Optional calendar hint only (ignore if it conflicts with the task or context): ${planned} min.`
      : "No calendar hint — total minutes must come from the task text + user context + reasonable setup/break allowance.";

  const p = body.profile;
  const profileLine =
    p && p.n > 0
      ? `User history (local aggregates, not identity): ${p.n} past sessions; typical length ~${p.avgMin ?? "?"} min; typical planned ~${p.avgPlanned ?? "?"} min; typical peak drift score ~${p.avgDrift ?? "?"}.`
      : "No prior session stats.";

  const ctxRaw = String(body.taskContextNote ?? "").trim().slice(0, 4000);
  const contextBlock = ctxRaw
    ? `User context (apply whenever relevant):\n${ctxRaw}`
    : "No user context note.";

  const rootlyRaw = String(body.rootlyContext ?? "").trim().slice(0, 2000);
  const rootlyBlock = rootlyRaw
    ? `Rootly / on-call incident context (operational workload, not medical):\n${rootlyRaw}\n`
    : "";

  const system = `You estimate total realistic focused time for the described work. Output ONLY valid JSON with keys: minutesMin (number), minutesMax (number), oneLiner (string, max 140 chars).

Rules:
- If the task names a quantity (e.g. "3 lectures", "5 videos", "read 4 chapters"), multiply per-unit time from context by that count. Example: one lecture 85 min at 2.5× → ~34 min watching; three → ~102 min (tight band, e.g. 95–110).
- Derive per-unit duration from user context (stated length, platform, playback speed). Do arithmetic; do not output a single-unit time when the task asks for multiple units.
- If Rootly context indicates incident response, comms, or higher severity, bias estimates toward coordination + verification time (still a tight band).
- If there is no calendar hint, do NOT anchor to arbitrary short defaults — long batch tasks can exceed 60–90 minutes.
- minutesMin and minutesMax should be a narrow band (roughly within ~15% of the midpoint unless uncertainty is genuinely high).
- Never mention medical or clinical claims.`;

  const user = `Task: ${goal}\nMode: ${mode}\n${plannedLine}\n${rootlyBlock}${contextBlock}\n${profileLine}\nReturn JSON only.`;

  const result = await claudeJsonCompletion<Out>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 200, temperature: 0.15 },
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: 502, headers: corsHeaders },
    );
  }

  const d = result.data;
  if (
    typeof d.minutesMin !== "number" ||
    typeof d.minutesMax !== "number" ||
    typeof d.oneLiner !== "string"
  ) {
    return Response.json(
      { error: "Bad model shape" },
      { status: 502, headers: corsHeaders },
    );
  }

  const clamp = (n: number) => Math.min(720, Math.max(5, Math.round(n)));
  return Response.json(
    {
      minutesMin: clamp(Math.min(d.minutesMin, d.minutesMax)),
      minutesMax: clamp(Math.max(d.minutesMin, d.minutesMax)),
      oneLiner: d.oneLiner.slice(0, 200),
    },
    { headers: corsHeaders },
  );
}
