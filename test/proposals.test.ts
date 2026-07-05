import { afterEach, describe, expect, it, vi } from "vitest";

// `createClient` (Supabase server, cliente de sesión del consultor/cliente)
// y `createAdminClient` (service-role) mockeados: mismo patrón que
// test/company-members.test.ts.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/stripe/client", () => {
  class FakeStripeError extends Error {
    code: "disabled" | "failed";
    constructor(code: "disabled" | "failed", message?: string) {
      super(message ?? code);
      this.name = "StripeError";
      this.code = code;
    }
  }
  return {
    getStripe: vi.fn(),
    StripeError: FakeStripeError,
  };
});

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, StripeError } from "@/lib/stripe/client";
import { acceptProposal, createCheckoutSession, createProposal } from "@/lib/actions/proposals";

// z.uuid() valida el nibble de variante RFC4122 (8/9/a/b en el 3er grupo).
const CONSULTANT_ID = "11111111-1111-4111-a111-111111111111";
const CLIENT_USER_ID = "22222222-2222-4222-a222-222222222222";
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

describe("acceptProposal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /** Cliente de sesión del cliente final: lee `proposals` (RLS lo acota a
   * SU empresa) y expone `auth.getUser()`. */
  function fakeSessionClient(opts: {
    user?: { id: string } | null;
    proposal?: QueryResult;
  } = {}) {
    const { user = { id: CLIENT_USER_ID }, proposal = null } = opts;
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn((table: string) => {
        if (table === "proposals") return chain(proposal ?? { data: null, error: null });
        throw new Error(`tabla no mockeada en el test (session): ${table}`);
      }),
    };
  }

  /** Cliente service-role: hace el UPDATE de `proposals` y el INSERT de
   * `audit_log` (el cliente final no tiene policy de UPDATE ni de INSERT en
   * audit_log — ver comentario de la función). */
  function fakeAdminClient(opts: {
    updateResult?: QueryResult;
    auditInsert?: QueryResult;
  } = {}) {
    const {
      updateResult = { data: { id: PROPOSAL_ID }, error: null },
      auditInsert = { data: null, error: null },
    } = opts;
    const updateChain = {
      eq: () => updateChain,
      select: () => updateChain,
      maybeSingle: () => Promise.resolve(updateResult),
    };
    return {
      from: vi.fn((table: string) => {
        if (table === "proposals") return { update: () => updateChain };
        if (table === "audit_log") return { insert: () => Promise.resolve(auditInsert) };
        throw new Error(`tabla no mockeada en el test (admin): ${table}`);
      }),
    };
  }

  it("Zod inválido (proposalId no-uuid) devuelve validation sin tocar supabase", async () => {
    const session = fakeSessionClient();
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await acceptProposal("no-es-uuid");
    expect(result).toEqual({ ok: false, error: "validation" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve unauthorized", async () => {
    const session = fakeSessionClient({ user: null });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await acceptProposal(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("propuesta inexistente o de otra empresa (RLS) devuelve not_found", async () => {
    const session = fakeSessionClient({ proposal: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await acceptProposal(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("status 'sent' -> acepta OK: UPDATE con service-role + audit_log", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: { id: PROPOSAL_ID, company_id: COMPANY_ID, status: "sent" },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);
    const admin = fakeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await acceptProposal(PROPOSAL_ID);

    expect(result).toEqual({ ok: true });
    expect(admin.from).toHaveBeenCalledWith("proposals");
    expect(admin.from).toHaveBeenCalledWith("audit_log");
  });

  it("status 'accepted' es idempotente: devuelve ok sin volver a mutar", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: { id: PROPOSAL_ID, company_id: COMPANY_ID, status: "accepted" },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await acceptProposal(PROPOSAL_ID);

    expect(result).toEqual({ ok: true });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("status 'paid' devuelve conflict", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: { id: PROPOSAL_ID, company_id: COMPANY_ID, status: "paid" },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await acceptProposal(PROPOSAL_ID);

    expect(result).toEqual({ ok: false, error: "conflict" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("carrera perdida en el UPDATE (ya no está 'sent') devuelve conflict", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: { id: PROPOSAL_ID, company_id: COMPANY_ID, status: "sent" },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);
    const admin = fakeAdminClient({ updateResult: { data: null, error: null } });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await acceptProposal(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "conflict" });
  });
});

describe("createCheckoutSession", () => {
  const PAYMENT_ID = "66666666-6666-4666-a666-666666666666";
  const SESSION_ID = "cs_test_123";

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** Cliente de sesión del cliente final: lee `proposals` (RLS lo acota a SU
   * empresa) y expone `auth.getUser()` — mismo patrón que en acceptProposal. */
  function fakeSessionClient(opts: {
    user?: { id: string } | null;
    proposal?: QueryResult;
  } = {}) {
    const { user = { id: CLIENT_USER_ID }, proposal = null } = opts;
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: vi.fn((table: string) => {
        if (table === "proposals") return chain(proposal ?? { data: null, error: null });
        throw new Error(`tabla no mockeada en el test (session): ${table}`);
      }),
    };
  }

  /** Cliente service-role: gestiona `payments` (select del pendiente
   * existente, insert si no hay, update de amount/session id) y el insert de
   * `audit_log`. `insertFieldsSeen` captura los `insert()` de `payments` para
   * poder verificar el `unit_amount`/`amount_clp` sin *100 desde el lado del
   * upsert. */
  function fakeAdminClient(opts: {
    existingPayment?: QueryResult;
    insertResult?: QueryResult;
    insertFieldsSeen?: unknown[];
    updateFieldsSeen?: unknown[];
  } = {}) {
    const {
      existingPayment = { data: null, error: null },
      insertResult = { data: { id: PAYMENT_ID }, error: null },
      insertFieldsSeen = [],
      updateFieldsSeen = [],
    } = opts;

    const paymentsTable = {
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve(existingPayment) }),
        }),
      }),
      insert: (fields: unknown) => {
        insertFieldsSeen.push(fields);
        return {
          select: () => ({ single: () => Promise.resolve(insertResult) }),
        };
      },
      update: (fields: unknown) => {
        updateFieldsSeen.push(fields);
        return { eq: () => Promise.resolve({ data: null, error: null }) };
      },
    };

    return {
      from: vi.fn((table: string) => {
        if (table === "payments") return paymentsTable;
        if (table === "audit_log") return { insert: () => Promise.resolve({ data: null, error: null }) };
        throw new Error(`tabla no mockeada en el test (admin): ${table}`);
      }),
      _insertFieldsSeen: insertFieldsSeen,
      _updateFieldsSeen: updateFieldsSeen,
    };
  }

  it("Zod inválido (proposalId no-uuid) devuelve validation sin tocar supabase", async () => {
    const result = await createCheckoutSession("no-es-uuid");
    expect(result).toEqual({ ok: false, error: "validation" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve unauthorized", async () => {
    const session = fakeSessionClient({ user: null });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await createCheckoutSession(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("propuesta inexistente o de otra empresa (RLS) devuelve not_found", async () => {
    const session = fakeSessionClient({ proposal: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await createCheckoutSession(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("status 'sent' (sin aceptar aún) devuelve conflict", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: {
          id: PROPOSAL_ID,
          company_id: COMPANY_ID,
          plan: "Plan Pro",
          amount_clp: 1500000,
          status: "sent",
        },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await createCheckoutSession(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "conflict" });
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("status 'paid' (ya pagada) devuelve conflict", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: {
          id: PROPOSAL_ID,
          company_id: COMPANY_ID,
          plan: "Plan Pro",
          amount_clp: 1500000,
          status: "paid",
        },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await createCheckoutSession(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "conflict" });
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("sin STRIPE_SECRET_KEY (getStripe lanza StripeError('disabled')) devuelve disabled", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: {
          id: PROPOSAL_ID,
          company_id: COMPANY_ID,
          plan: "Plan Pro",
          amount_clp: 1500000,
          status: "accepted",
        },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);
    vi.mocked(getStripe).mockImplementation(() => {
      throw new StripeError("disabled");
    });

    const result = await createCheckoutSession(PROPOSAL_ID);
    expect(result).toEqual({ ok: false, error: "disabled" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("status 'accepted' + Stripe OK: crea payment pending + session, devuelve url (CLP SIN *100)", async () => {
    const session = fakeSessionClient({
      proposal: {
        data: {
          id: PROPOSAL_ID,
          company_id: COMPANY_ID,
          plan: "Plan Pro",
          amount_clp: 1500000,
          status: "accepted",
        },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const admin = fakeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const createSession = vi.fn().mockResolvedValue({
      id: SESSION_ID,
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: createSession } },
    } as never);

    const result = await createCheckoutSession(PROPOSAL_ID);

    expect(result).toEqual({
      ok: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });

    // payments insertado en 'pending' con el monto de la propuesta.
    expect(admin._insertFieldsSeen).toEqual([
      {
        proposal_id: PROPOSAL_ID,
        company_id: COMPANY_ID,
        amount_clp: 1500000,
        status: "pending",
      },
    ]);

    // stripe_session_id persistido tras crear la Checkout Session.
    expect(admin._updateFieldsSeen).toContainEqual({ stripe_session_id: SESSION_ID });

    // CLP es zero-decimal en Stripe: unit_amount === amount_clp, SIN *100.
    expect(createSession).toHaveBeenCalledTimes(1);
    const callArgs = createSession.mock.calls[0][0];
    expect(callArgs.line_items[0].price_data.unit_amount).toBe(1500000);
    expect(callArgs.mode).toBe("payment");
    expect(callArgs.metadata).toEqual({
      proposal_id: PROPOSAL_ID,
      company_id: COMPANY_ID,
      payment_id: PAYMENT_ID,
    });
  });
});
