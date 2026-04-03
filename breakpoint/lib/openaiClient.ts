type ChatMessage = { role: "system" | "user"; content: string };

export async function openaiJsonCompletion<T>(
  messages: ChatMessage[],
  options: { maxTokens: number; temperature?: number },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    return { ok: false, error: "OPENAI_API_KEY is not set on the server." };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: options.maxTokens,
      temperature: options.temperature ?? 0.25,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      error: text.slice(0, 200) || `OpenAI HTTP ${res.status}`,
    };
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = body.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return { ok: false, error: "Empty model response." };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, error: "Model returned non-JSON." };
  }
}
