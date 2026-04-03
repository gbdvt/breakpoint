import { openaiJsonCompletion } from "@/lib/openaiClient";

export const runtime = "nodejs";

type Body = {
  goal: string;
  mode: string;
  plannedDurationMin: number;
  profile?: {
    n: number;
    avgMin: number | null;
    avgDrift: number | null;
    avgPlanned: number | null;
  };
};

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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const goal = String(body.goal ?? "").trim().slice(0, 500);
  if (!goal) {
    return Response.json({ error: "goal required" }, { status: 400 });
  }

  const mode = String(body.mode ?? "work").slice(0, 32);
  const planned = Math.min(
    480,
    Math.max(1, Number(body.plannedDurationMin) || 45),
  );

  const p = body.profile;
  const profileLine =
    p && p.n > 0
      ? `User history (local aggregates, not identity): ${p.n} past sessions; typical length ~${p.avgMin ?? "?"} min; typical planned ~${p.avgPlanned ?? "?"} min; typical peak drift score ~${p.avgDrift ?? "?"}.`
      : "No prior session stats.";

  const system = `You estimate realistic focused work time for a single task. Output ONLY valid JSON with keys: minutesMin (number), minutesMax (number), oneLiner (string, max 140 chars). Be conservative; use profile to nudge if they often run shorter/longer than planned. Never mention medical or clinical claims.`;

  const user = `Task: ${goal}\nMode: ${mode}\nUser planned block: ${planned} min\n${profileLine}\nReturn JSON only.`;

  const result = await openaiJsonCompletion<Out>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 120, temperature: 0.2 },
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  const d = result.data;
  if (
    typeof d.minutesMin !== "number" ||
    typeof d.minutesMax !== "number" ||
    typeof d.oneLiner !== "string"
  ) {
    return Response.json({ error: "Bad model shape" }, { status: 502 });
  }

  const clamp = (n: number) => Math.min(480, Math.max(5, Math.round(n)));
  return Response.json({
    minutesMin: clamp(Math.min(d.minutesMin, d.minutesMax)),
    minutesMax: clamp(Math.max(d.minutesMin, d.minutesMax)),
    oneLiner: d.oneLiner.slice(0, 200),
  });
}
