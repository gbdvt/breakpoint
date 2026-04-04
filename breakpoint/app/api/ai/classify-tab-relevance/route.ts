import { claudeJsonCompletion } from "@/lib/anthropicClient";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

type Body = { goal: string; tabTitle: string };
type Out = { relevant: boolean };

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

  const goal = String(body.goal ?? "").trim().slice(0, 800);
  const tabTitle = String(body.tabTitle ?? "").trim().slice(0, 400);
  if (!goal || !tabTitle) {
    return Response.json(
      { error: "goal and tabTitle required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const system = `You judge whether a browser tab title plausibly matches a user's stated focus session goal (e.g. ChatGPT titles often echo the first user message). Output ONLY valid JSON: {"relevant": true} if the tab title suggests work aligned with the goal, or {"relevant": false} if it is clearly unrelated, idle, entertainment, or off-topic. When uncertain, prefer true. No other keys.`;

  const user = `Goal:\n${goal}\n\nTab title:\n${tabTitle}`;

  const result = await claudeJsonCompletion<Out>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 80, temperature: 0.1 },
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: 502, headers: corsHeaders },
    );
  }

  if (typeof result.data.relevant !== "boolean") {
    return Response.json(
      { error: "Bad model shape" },
      { status: 502, headers: corsHeaders },
    );
  }

  return Response.json(
    { relevant: result.data.relevant },
    { headers: corsHeaders },
  );
}
