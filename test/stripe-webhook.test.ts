import { afterEach, describe, expect, it, vi } from "vitest";

// Mismo patrón de mocking que test/proposals.test.ts: `createAdminClient`
// (service-role, sin sesión de usuario) y el cliente Stripe mockeados.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
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

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, StripeError } from "@/lib/stripe/client";
import { POST } from "@/app/api/stripe/webhook/route";

const PROPOSAL_ID = "55555555-5555-4555-a555-555555555555";
const PAYMENT_ID = "66666666-6666-4666-a666-666666666666";
const SESSION_ID = "cs_test_123";
const PAYMENT_INTENT_ID = "pi_test_123";

type QueryResult = { data: unknown; error: unknown };

/** Cliente admin fake: `payments` (select por stripe_session_id + update) y
 * `proposals`/`audit_log` (update/insert). `mutations` registra cada
 * update/insert para poder afirmar (o negar) que se re-mutó. */
function fakeAdminClient(opts: {
  paymentLookup?: QueryResult;
  paymentUpdate?: QueryResult;
  proposalUpdate?: QueryResult;
} = {}) {
  const {
    paymentLookup = { data: null, error: null },
    paymentUpdate = { data: null, error: null },
    proposalUpdate = { data: null, error: null },
  } = opts;

  const mutations: { table: string; op: string; fields: unknown }[] = [];

  const paymentsTable = {
    select: () => ({
      eq: () => ({ maybeSingle: () => Promise.resolve(paymentLookup) }),
    }),
    update: (fields: unknown) => {
      mutations.push({ table: "payments", op: "update", fields });
      return { eq: () => Promise.resolve(paymentUpdate) };
    },
  };
  const proposalsTable = {
    update: (fields: unknown) => {
      mutations.push({ table: "proposals", op: "update", fields });
      return { eq: () => Promise.resolve(proposalUpdate) };
    },
  };
  const auditLogTable = {
    insert: (fields: unknown) => {
      mutations.push({ table: "audit_log", op: "insert", fields });
      return Promise.resolve({ data: null, error: null });
    },
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "payments") return paymentsTable;
      if (table === "proposals") return proposalsTable;
      if (table === "audit_log") return auditLogTable;
      throw new Error(`tabla no mockeada en el test: ${table}`);
    }),
    _mutations: mutations,
  };
}

function fakeStripe(opts: {
  constructEvent?: (...args: unknown[]) => unknown;
}) {
  return {
    webhooks: {
      constructEvent:
        opts.constructEvent ??
        vi.fn(() => {
          throw new Error("no configurado en este test");
        }),
    },
  };
}

function checkoutSessionCompletedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: SESSION_ID,
        payment_intent: PAYMENT_INTENT_ID,
        metadata: { proposal_id: PROPOSAL_ID, payment_id: PAYMENT_ID },
        ...overrides,
      },
    },
  };
}

function makeRequest(body: string, signature: string | null = "t=1,v1=fake") {
  const headers = new Map<string, string>();
  if (signature) headers.set("stripe-signature", signature);
  return {
    text: () => Promise.resolve(body),
    headers: { get: (key: string) => headers.get(key) ?? null },
  } as unknown as Request;
}

describe("POST /api/stripe/webhook", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("sin STRIPE_SECRET_KEY (getStripe deshabilitado) responde 503", async () => {
    vi.mocked(getStripe).mockImplementation(() => {
      throw new StripeError("disabled");
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(503);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("firma inválida (constructEvent lanza) responde 400", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const constructEvent = vi.fn(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe({ constructEvent }) as never);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("falta STRIPE_WEBHOOK_SECRET responde 400 sin invocar constructEvent útilmente", async () => {
    const constructEvent = vi.fn();
    vi.mocked(getStripe).mockReturnValue(fakeStripe({ constructEvent }) as never);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
  });

  it("checkout.session.completed con payment pending existente: marca paid (payments+proposals) + audit, responde 200", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const event = checkoutSessionCompletedEvent();
    const constructEvent = vi.fn(() => event);
    vi.mocked(getStripe).mockReturnValue(fakeStripe({ constructEvent }) as never);

    const admin = fakeAdminClient({
      paymentLookup: {
        data: { id: PAYMENT_ID, proposal_id: PROPOSAL_ID, status: "pending" },
        error: null,
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    expect(admin._mutations).toEqual([
      {
        table: "payments",
        op: "update",
        fields: { status: "paid", stripe_payment_intent: PAYMENT_INTENT_ID },
      },
      { table: "proposals", op: "update", fields: { status: "paid" } },
      {
        table: "audit_log",
        op: "insert",
        fields: {
          actor_id: null,
          action: "payment.paid",
          entity: "payments",
          entity_id: PAYMENT_ID,
          detail: {
            proposal_id: PROPOSAL_ID,
            stripe_event_id: "evt_test_1",
            stripe_event_type: "checkout.session.completed",
          },
        },
      },
    ]);
  });

  it("segundo evento idéntico (payment ya 'paid') responde 200 sin re-mutar (idempotente)", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const event = checkoutSessionCompletedEvent();
    const constructEvent = vi.fn(() => event);
    vi.mocked(getStripe).mockReturnValue(fakeStripe({ constructEvent }) as never);

    const admin = fakeAdminClient({
      paymentLookup: {
        data: { id: PAYMENT_ID, proposal_id: PROPOSAL_ID, status: "paid" },
        error: null,
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    expect(admin._mutations).toEqual([]);
  });

  it("evento de sesión desconocida (sin payment asociado) responde 200 sin mutar", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const event = checkoutSessionCompletedEvent({
      id: "cs_test_desconocida",
      metadata: {},
    });
    const constructEvent = vi.fn(() => event);
    vi.mocked(getStripe).mockReturnValue(fakeStripe({ constructEvent }) as never);

    const admin = fakeAdminClient({ paymentLookup: { data: null, error: null } });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    expect(admin._mutations).toEqual([]);
  });

  it("tipo de evento no manejado responde 200 sin tocar supabase", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const event = { id: "evt_other", type: "customer.created", data: { object: {} } };
    const constructEvent = vi.fn(() => event);
    vi.mocked(getStripe).mockReturnValue(fakeStripe({ constructEvent }) as never);

    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("error inesperado de supabase durante la conciliación responde 500", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const event = checkoutSessionCompletedEvent();
    const constructEvent = vi.fn(() => event);
    vi.mocked(getStripe).mockReturnValue(fakeStripe({ constructEvent }) as never);

    const admin = fakeAdminClient({
      paymentLookup: { data: null, error: { message: "db caída" } },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(500);
  });
});
