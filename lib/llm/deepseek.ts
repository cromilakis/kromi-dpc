export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class LlmError extends Error {
  constructor(public code: "llm_disabled" | "llm_failed", message?: string) {
    super(message ?? code);
    this.name = "LlmError";
  }
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 30_000;

async function once(messages: ChatMessage[], signal?: AbortSignal) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new LlmError("llm_disabled");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const retriable = res.status >= 500;
      throw Object.assign(new LlmError("llm_failed", `HTTP ${res.status}`), { retriable });
    }
    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content ?? "", usage: data.usage };
  } catch (cause) {
    if (cause instanceof LlmError && cause.code === "llm_disabled") throw cause;
    const retriable = (cause as { retriable?: boolean })?.retriable ?? true; // timeout/red = retriable
    throw Object.assign(new LlmError("llm_failed", String(cause)), { retriable });
  } finally {
    clearTimeout(timer);
  }
}

export async function chatJSON(messages: ChatMessage[], opts?: { signal?: AbortSignal }) {
  try {
    return await once(messages, opts?.signal);
  } catch (cause) {
    if (cause instanceof LlmError && cause.code === "llm_disabled") throw cause;
    if ((cause as { retriable?: boolean })?.retriable) return once(messages, opts?.signal);
    throw cause;
  }
}
