import { afterEach, describe, expect, it, vi } from "vitest";

// `createClient` (Supabase server, cliente de sesión del consultor)
// mockeado: mismo patrón que test/company-members.test.ts.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createProposal } from "@/lib/actions/proposals";

// z.uuid() valida el nibble de variante RFC4122 (8/9/a/b en el 3er grupo).
const CONSULTANT_ID = "11111111-1111-4111-a111-111111111111";
const COMPANY_ID = "33333333-3333-4333-a333-333333333333";
const PROPOSAL_ID = "55555555-5555-4555-a555-555555555555";

type QueryResult = { data: unknown; error: unknown };

/** Builder encadenable mínimo: métodos intermedios devuelven `this`, los
 * terminales (`maybeSingle`, `single`, `then`) resuelven `result`. */
function chain(result: QueryResult) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    insert: () => obj,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (r: QueryResult) => unknown) => resolve(result),
  };
  return obj;
}

type FakeSupabaseOpts = {
  profile?: QueryResult;
  proposalInsert?: QueryResult;
  auditInsert?: QueryResult;
  user?: { id: string } | null;
};

function fakeSupabase(opts: FakeSupabaseOpts = {}) {
  const {
    profile = { data: { role: "consultant" }, error: null },
    proposalInsert = { data: { id: PROPOSAL_ID }, error: null },
    auditInsert = { data: null, error: null },
    user = { id: CONSULTANT_ID },
  } = opts;

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") return chain(profile);
      if (table === "proposals") return chain(proposalInsert);
      if (table === "audit_log") return chain(auditInsert);
      throw new Error(`tabla no mockeada en el test: ${table}`);
    }),
  };

  return supabase;
}

describe("createProposal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("valida la entrada (companyId no-uuid, plan vacío o monto no positivo)", async () => {
    const supabase = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const badCompany = await createProposal("no-es-uuid", {
      plan: "Plan Pro",
      amountClp: 100000,
    });
    expect(badCompany).toEqual({ ok: false, error: "validation" });

    const badPlan = await createProposal(COMPANY_ID, { plan: "", amountClp: 100000 });
    expect(badPlan).toEqual({ ok: false, error: "validation" });

    const badAmount = await createProposal(COMPANY_ID, { plan: "Plan Pro", amountClp: 0 });
    expect(badAmount).toEqual({ ok: false, error: "validation" });

    const negativeAmount = await createProposal(COMPANY_ID, {
      plan: "Plan Pro",
      amountClp: -100,
    });
    expect(negativeAmount).toEqual({ ok: false, error: "validation" });

    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve unauthorized", async () => {
    const supabase = fakeSupabase({ user: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createProposal(COMPANY_ID, {
      plan: "Plan Pro",
      amountClp: 100000,
    });
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("usuario sin profile de staff (no consultor/admin) devuelve unauthorized", async () => {
    const supabase = fakeSupabase({ profile: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createProposal(COMPANY_ID, {
      plan: "Plan Pro",
      amountClp: 100000,
    });
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("rol cliente (no staff) devuelve unauthorized", async () => {
    const supabase = fakeSupabase({ profile: { data: { role: "client" }, error: null } });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createProposal(COMPANY_ID, {
      plan: "Plan Pro",
      amountClp: 100000,
    });
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("crea OK: inserta la propuesta 'sent', audita y devuelve proposalId", async () => {
    const supabase = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createProposal(COMPANY_ID, {
      plan: "Plan Pro",
      amountClp: 1500000,
    });

    expect(result).toEqual({ ok: true, proposalId: PROPOSAL_ID });
    expect(supabase.from).toHaveBeenCalledWith("proposals");
    expect(supabase.from).toHaveBeenCalledWith("audit_log");
  });

  it("inserta proposals con los campos correctos (status sent, currency clp)", async () => {
    const insertFieldsSeen: unknown[] = [];
    const supabase = fakeSupabase();
    supabase.from = vi.fn((table: string) => {
      if (table === "profiles") return chain({ data: { role: "consultant" }, error: null });
      if (table === "proposals") {
        return {
          insert: (fields: unknown) => {
            insertFieldsSeen.push(fields);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: PROPOSAL_ID }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "audit_log") return { insert: () => Promise.resolve({ data: null, error: null }) };
      throw new Error(`tabla no mockeada: ${table}`);
    }) as never;
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createProposal(COMPANY_ID, {
      plan: "Plan Pro",
      amountClp: 1500000,
    });

    expect(result).toEqual({ ok: true, proposalId: PROPOSAL_ID });
    expect(insertFieldsSeen).toEqual([
      {
        company_id: COMPANY_ID,
        plan: "Plan Pro",
        amount_clp: 1500000,
        currency: "clp",
        status: "sent",
        created_by: CONSULTANT_ID,
      },
    ]);
  });

  it("error inesperado al insertar proposals devuelve unavailable", async () => {
    const supabase = fakeSupabase({
      proposalInsert: { data: null, error: { message: "boom" } },
    });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await createProposal(COMPANY_ID, {
      plan: "Plan Pro",
      amountClp: 100000,
    });

    expect(result).toEqual({ ok: false, error: "unavailable" });
  });
});
