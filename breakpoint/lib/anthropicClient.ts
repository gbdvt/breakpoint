type ChatMessage = { role: "system" | "user"; content: string };

function extractJsonObjectText(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (fence) t = fence[1].trim();
  return t;
}

function parseAnthropicErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as {
      error?: { message?: string };
      message?: string;
    };
    if (j?.error?.message) return j.error.message;
    if (typeof j?.message === "string") return j.message;
  } catch {
    /* plain text */
  }
  return text.slice(0, 600);
}

function shouldRetryOtherModel(status: number, msg: string): boolean {
  if (status !== 400 && status !== 404) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("model") ||
    m.includes("not_found") ||
    m.includes("deprecated") ||
    m.includes("does not exist") ||
    m.includes("invalid model") ||
    m.includes("unknown model")
  );
}

/** Tried in order; env ANTHROPIC_MODEL first when set. */
const MODEL_FALLBACKS = [
  "claude-sonnet-4-20250514",
  "claude-3-5-haiku-20241022",
  "claude-3-haiku-20240307",
] as const;

function modelsToTry(): string[] {
  const primary = process.env.ANTHROPIC_MODEL?.trim();
  const list = primary ? [primary, ...MODEL_FALLBACKS] : [...MODEL_FALLBACKS];
  return [...new Set(list)];
}

/**
 * Claude Messages API — same message shape as the old OpenAI helper.
 * Set ANTHROPIC_API_KEY; optional ANTHROPIC_MODEL (otherwise tries current Sonnet, then Haiku fallbacks).
 */
export async function claudeJsonCompletion<T>(
  messages: ChatMessage[],
  options: { maxTokens: number; temperature?: number },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key?.trim()) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not set on the server." };
  }

  let system = "";
  const userParts: string[] = [];
  for (const m of messages) {
    if (m.role === "system") system = m.content;
    else userParts.push(m.content);
  }
  const userContent = userParts.join("\n\n");

  const models = modelsToTry();
  let lastError = "Anthropic request failed.";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.max(options.maxTokens, 256),
        temperature: options.temperature ?? 0.25,
        ...(system ? { system } : {}),
        messages: [
          { role: "user", content: userContent || "(no user message)" },
        ],
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      const msg = parseAnthropicErrorBody(raw);
      lastError = `Anthropic (${model}): ${msg}`;
      const retry =
        i < models.length - 1 && shouldRetryOtherModel(res.status, msg);
      if (retry) continue;
      return { ok: false, error: lastError };
    }

    const body = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      stop_reason?: string;
    };
    const blocks = body.content;
    const raw =
      Array.isArray(blocks) && blocks.length > 0
        ? blocks
            .filter((b) => b?.type === "text" && typeof b.text === "string")
            .map((b) => b.text)
            .join("")
            .trim()
        : "";
    if (!raw) {
      return {
        ok: false,
        error: `Empty model response (${model}, stop_reason=${body.stop_reason ?? "?"})`,
      };
    }

    const jsonText = extractJsonObjectText(raw);
    try {
      return { ok: true, data: JSON.parse(jsonText) as T };
    } catch {
      return {
        ok: false,
        error: `Model returned non-JSON (${model}). First 200 chars: ${jsonText.slice(0, 200)}`,
      };
    }
  }

  return { ok: false, error: lastError };
}
