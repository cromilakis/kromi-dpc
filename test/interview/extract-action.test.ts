import { afterEach, describe, expect, it, vi } from "vitest";

import { LlmError } from "@/lib/llm/deepseek";
import type { ExtractionResult } from "@/lib/llm/extract-diagnosis";

// `extractDiagnosis` (LLM) mockeado: estos tests no deben pegarle a la red.
vi.mock("@/lib/llm/extract-diagnosis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm/extract-diagnosis")>(
    "@/lib/llm/extract-diagnosis",
  );
  return { ...actual, extractDiagnosis: vi.fn() };
});

// `createClient` (Supabase server) mockeado: se arma un builder encadenable
// mínimo que resuelve según la tabla + el orden de llamada, ya que la action
// hace varias lecturas (`interview_sessions`, `companies`, `controls`) y
// luego un `update` + `insert` (audit_log) sobre la misma tabla de sesión.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { extractDiagnosis } from "@/lib/llm/extract-diagnosis";
import { extractDiagnosisFromTranscript } from "@/lib/actions/interview";

// z.uuid() valida el nibble de variante RFC4122 (8/9/a/b en el 3er grupo);
// no basta con dígitos repetidos arbitrarios.
const USER_ID = "11111111-1111-4111-a111-111111111111";
const SESSION_ID = "22222222-2222-4222-a222-222222222222";
const COMPANY_ID = "33333333-3333-4333-a333-333333333333";

type QueryResult = { data: unknown; error: unknown };

/** Builder encadenable: cada método intermedio devuelve `this`; los
 * métodos terminales (`maybeSingle`, `then`) resuelven `result`. */
function chain(result: QueryResult) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    or: () => obj,
    order: () => obj,
    limit: () => obj,
    insert: () => obj,
    update: () => obj,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (r: QueryResult) => unknown) => resolve(result),
  };
  return obj;
}

type FakeSupabaseOpts = {
  session?: QueryResult;
  company?: QueryResult;
  controls?: QueryResult;
  update?: QueryResult;
  auditInsert?: QueryResult;
  user?: { id: string } | null;
};

function fakeSupabase(opts: FakeSupabaseOpts = {}) {
  const {
    session = {
      data: { id: SESSION_ID, company_id: COMPANY_ID, answers: {} },
      error: null,
    },
    company = {
      data: { factors: [], sectors: { code: "salud" } },
      error: null,
    },
    controls = {
      data: [
        {
          id: "c1",
          code: "C1",
          name: "Ctrl 1",
          domain_id: "d1",
          verification_criteria: ["a", "b"],
          applies_when: null,
        },
      ],
      error: null,
    },
    update = { data: null, error: null },
    auditInsert = { data: null, error: null },
    user = { id: USER_ID },
  } = opts;

  const fromCalls: Record<string, number> = {};

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      fromCalls[table] = (fromCalls[table] ?? 0) + 1;
      if (table === "interview_sessions") {
        return fromCalls[table] === 1 ? chain(session) : chain(update);
      }
      if (table === "companies") return chain(company);
      if (table === "controls") return chain(controls);
      if (table === "audit_log") return chain(auditInsert);
      throw new Error(`tabla no mockeada en el test: ${table}`);
    }),
  };

  return supabase;
}

const validExtraction: ExtractionResult = {
  rat: [{ fields: { name: "Nómina" }, evidence: { name: "se llama Nómina" } }],
  compliance: [
    { controlCode: "C1", criterionIndex: 0, answer: "yes", evidence: "cita" },
  ],
  unassigned: [{ text: "algo ambiguo", reason: "sin cita" }],
  alerts: [],
};

describe("extractDiagnosisFromTranscript", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("valida la entrada (sessionId inválido o transcript vacío)", async () => {
    const supabase = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const badSession = await extractDiagnosisFromTranscript("no-es-uuid", "hola");
    expect(badSession).toEqual({ ok: false, error: "validation" });

    const emptyTranscript = await extractDiagnosisFromTranscript(SESSION_ID, "");
    expect(emptyTranscript).toEqual({ ok: false, error: "validation" });

    expect(createClient).not.toHaveBeenCalled();
  });

  it("con extractDiagnosis mockeado, persiste transcript+ai_extraction, NO toca answers, y deja audit_log", async () => {
    const supabase = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(extractDiagnosis).mockResolvedValue(validExtraction);

    const result = await extractDiagnosisFromTranscript(
      SESSION_ID,
      "transcripción de la reunión",
    );

    expect(result).toEqual({ ok: true, extraction: validExtraction });

    // El catálogo pasado al LLM ya viene filtrado por aplicabilidad.
    expect(extractDiagnosis).toHaveBeenCalledWith({
      transcript: "transcripción de la reunión",
      controls: [
        {
          code: "C1",
          name: "Ctrl 1",
          domain_id: "d1",
          verification_criteria: ["a", "b"],
          appliesWhen: null,
        },
      ],
    });

    // Se llamó a interview_sessions dos veces (lectura + update), y se dejó
    // rastro en audit_log. La forma exacta del `update` (sin `answers`) se
    // verifica en el siguiente test con un builder que captura los argumentos.
    const sessionCallCount = supabase.from.mock.calls.filter(
      (args) => args[0] === "interview_sessions",
    ).length;
    expect(sessionCallCount).toBe(2);

    expect(supabase.from).toHaveBeenCalledWith("interview_sessions");
    expect(supabase.from).toHaveBeenCalledWith("companies");
    expect(supabase.from).toHaveBeenCalledWith("controls");
    expect(supabase.from).toHaveBeenCalledWith("audit_log");
  });

  it("registra el update real con los campos correctos (sin `answers`)", async () => {
    const updateFieldsSeen: unknown[] = [];
    const supabase = fakeSupabase();
    // Reemplaza el chain de `interview_sessions` (2ª llamada) para capturar
    // los argumentos exactos de `.update(...)`.
    let sessionCallCount = 0;
    supabase.from = vi.fn((table: string) => {
      if (table === "interview_sessions") {
        sessionCallCount += 1;
        if (sessionCallCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: SESSION_ID, company_id: COMPANY_ID, answers: {} },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return {
          update: (fields: unknown) => {
            updateFieldsSeen.push(fields);
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          },
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { factors: [], sectors: { code: "salud" } },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "controls") {
        return {
          select: () => ({
            or: () =>
              Promise.resolve({
                data: [
                  {
                    id: "c1",
                    code: "C1",
                    name: "Ctrl 1",
                    domain_id: "d1",
                    verification_criteria: ["a", "b"],
                    applies_when: null,
                  },
                ],
                error: null,
              }),
          }),
        };
      }
      if (table === "audit_log") {
        return { insert: () => Promise.resolve({ data: null, error: null }) };
      }
      throw new Error(`tabla no mockeada: ${table}`);
    }) as never;
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(extractDiagnosis).mockResolvedValue(validExtraction);

    const result = await extractDiagnosisFromTranscript(SESSION_ID, "transcripción real");

    expect(result).toEqual({ ok: true, extraction: validExtraction });
    expect(updateFieldsSeen).toHaveLength(1);
    expect(updateFieldsSeen[0]).toEqual({
      transcript: "transcripción real",
      ai_extraction: validExtraction,
    });
    // Nunca se incluye `answers` en el update de esta action.
    expect(updateFieldsSeen[0]).not.toHaveProperty("answers");
  });

  it("filtra del catálogo los controles no aplicables (factors_any sin match, sin override)", async () => {
    const controlsData = [
      {
        id: "c1",
        code: "C1",
        name: "Ctrl general",
        domain_id: "d1",
        verification_criteria: ["a"],
        applies_when: null,
      },
      {
        id: "c2",
        code: "C2-INTL",
        name: "Transferencias internacionales",
        domain_id: "d2",
        verification_criteria: ["b"],
        applies_when: { factors_any: ["intl_transfer"] },
      },
    ];
    const supabase = fakeSupabase({
      company: { data: { factors: [], sectors: { code: "salud" } }, error: null },
      controls: { data: controlsData, error: null },
    });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(extractDiagnosis).mockResolvedValue(validExtraction);

    await extractDiagnosisFromTranscript(SESSION_ID, "transcripción sin transferencias intl");

    expect(extractDiagnosis).toHaveBeenCalledWith({
      transcript: "transcripción sin transferencias intl",
      controls: [
        {
          code: "C1",
          name: "Ctrl general",
          domain_id: "d1",
          verification_criteria: ["a"],
          appliesWhen: null,
        },
      ],
    });
  });

  it("respeta el override de aplicabilidad en answers.applicability", async () => {
    const controlsData = [
      {
        id: "c2",
        code: "C2-INTL",
        name: "Transferencias internacionales",
        domain_id: "d2",
        verification_criteria: ["b"],
        applies_when: { factors_any: ["intl_transfer"] },
      },
    ];
    const supabase = fakeSupabase({
      session: {
        data: {
          id: SESSION_ID,
          company_id: COMPANY_ID,
          answers: { applicability: { "C2-INTL": true } },
        },
        error: null,
      },
      company: { data: { factors: [], sectors: { code: "salud" } }, error: null },
      controls: { data: controlsData, error: null },
    });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(extractDiagnosis).mockResolvedValue(validExtraction);

    await extractDiagnosisFromTranscript(SESSION_ID, "transcripción con override");

    expect(extractDiagnosis).toHaveBeenCalledWith({
      transcript: "transcripción con override",
      controls: [
        {
          code: "C2-INTL",
          name: "Transferencias internacionales",
          domain_id: "d2",
          verification_criteria: ["b"],
          appliesWhen: { factors_any: ["intl_transfer"] },
        },
      ],
    });
  });

  it("si extractDiagnosis lanza LlmError('llm_disabled'), devuelve {ok:false, error:'llm_disabled'} y no persiste nada", async () => {
    const supabase = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(extractDiagnosis).mockRejectedValue(new LlmError("llm_disabled"));

    const result = await extractDiagnosisFromTranscript(SESSION_ID, "transcripción");

    expect(result).toEqual({ ok: false, error: "llm_disabled" });
    // No debió llegar a actualizar la sesión ni a insertar audit_log.
    expect(supabase.from).not.toHaveBeenCalledWith("audit_log");
  });

  it("si extractDiagnosis lanza LlmError('llm_failed'), devuelve {ok:false, error:'llm_failed'}", async () => {
    const supabase = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(extractDiagnosis).mockRejectedValue(new LlmError("llm_failed"));

    const result = await extractDiagnosisFromTranscript(SESSION_ID, "transcripción");

    expect(result).toEqual({ ok: false, error: "llm_failed" });
  });

  it("sin usuario autenticado devuelve unauthorized", async () => {
    const supabase = fakeSupabase({ user: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await extractDiagnosisFromTranscript(SESSION_ID, "transcripción");
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("sesión inexistente devuelve not_found", async () => {
    const supabase = fakeSupabase({ session: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await extractDiagnosisFromTranscript(SESSION_ID, "transcripción");
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});
