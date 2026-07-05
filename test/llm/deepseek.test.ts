import { afterEach, describe, expect, it, vi } from "vitest";
import { chatJSON, LlmError } from "@/lib/llm/deepseek";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("chatJSON", () => {
  it("lanza llm_disabled si falta la API key", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    await expect(chatJSON([{ role: "user", content: "hola" }])).rejects.toMatchObject({
      code: "llm_disabled",
    });
  });

  it("devuelve content+usage con fetch OK", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"ok":true}' } }],
              usage: { total_tokens: 5 },
            }),
            { status: 200 },
          ),
      ),
    );
    const out = await chatJSON([{ role: "user", content: "x" }]);
    expect(out.content).toBe('{"ok":true}');
    expect(out.usage).toEqual({ total_tokens: 5 });
  });

  it("reintenta una vez ante 5xx y luego propaga llm_failed", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    const fetchMock = vi.fn(async () => new Response("err", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(chatJSON([{ role: "user", content: "x" }])).rejects.toMatchObject({
      code: "llm_failed",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
