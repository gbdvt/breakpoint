import { claudeJsonCompletion } from "@/lib/anthropicClient";

export const runtime = "nodejs";

type Body = {
  goal: string;
  mode: string;
  digest: string;
  /** Short rule-based labels to anchor the model (saves tokens vs raw events). */
  hints?: string;
};

type Out = { summary: string; nudge: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const goal = String(body.goal ?? "").trim().slice(0, 400);
  const digest = String(body.digest ?? "").trim().slice(0, 8000);
  if (!digest) {
    return Response.json({ error: "digest required" }, { status: 400 });
  }

  const mode = String(body.mode ?? "work").slice(0, 32);
  const hints = body.hints?.slice(0, 400) ?? "";

  const system = `You interpret a browser activity log for a focus session. Output ONLY JSON: summary (2 short sentences, plain language), nudge (one concrete next-step line, max 120 chars). Name patterns like reactive drift or research inflation only if the log supports it. No medical claims.`;

  const user = `Goal: ${goal}\nMode: ${mode}\nHeuristics: ${hints || "none"}\nRecent events (newest at bottom):\n${digest}`;

  const result = await claudeJsonCompletion<Out>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 220, temperature: 0.35 },
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  const d = result.data;
  if (typeof d.summary !== "string" || typeof d.nudge !== "string") {
    return Response.json({ error: "Bad model shape" }, { status: 502 });
  }

  return Response.json({
    summary: d.summary.slice(0, 600),
    nudge: d.nudge.slice(0, 200),
  });
}
