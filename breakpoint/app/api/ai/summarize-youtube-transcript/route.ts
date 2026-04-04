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

type Body = {
  transcript: string;
  title?: string;
};

type Out = { bullets: string[] };

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

  const transcript = String(body.transcript ?? "").trim().slice(0, 24_000);
  if (transcript.length < 40) {
    return Response.json(
      { error: "transcript too short or missing" },
      { status: 400, headers: corsHeaders },
    );
  }

  const title = String(body.title ?? "").trim().slice(0, 200);

  const system = `You summarize YouTube-style transcripts for a focus/productivity app. Output ONLY valid JSON with key "bullets": an array of exactly 5 short strings. Each bullet is one concrete takeaway (topic, claim, or step)—no numbering inside strings, no markdown, no medical claims. If the transcript is thin or repetitive, still output 5 distinct best-effort lines.`;

  const user = `${title ? `Video title: ${title}\n` : ""}Transcript (may include auto-captions):\n${transcript}`;

  const result = await claudeJsonCompletion<Out>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 400, temperature: 0.35 },
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: 502, headers: corsHeaders },
    );
  }

  const raw = result.data.bullets;
  if (!Array.isArray(raw)) {
    return Response.json(
      { error: "Bad model shape" },
      { status: 502, headers: corsHeaders },
    );
  }

  const bullets = raw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (bullets.length === 0) {
    return Response.json(
      { error: "Model returned no bullets" },
      { status: 502, headers: corsHeaders },
    );
  }

  return Response.json({ bullets: bullets.slice(0, 5) }, { headers: corsHeaders });
}
