import { afterEach, describe, expect, it, vi } from "vitest";

// Mismo patrón que test/proposals.test.ts / test/evidences.test.ts:
// `createClient` (sesión del cliente autenticado) y `createAdminClient`
// (service-role) mockeados.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestRecertification } from "@/lib/actions/recert";
import { RECERT_CONSENT_VERSION } from "@/lib/recert/gate";

const CLIENT_USER_ID = "22222222-2222-4222-a222-222222222222";
const COMPANY_ID = "33333333-3333-4333-a333-333333333333";
const ASSESSMENT_ID = "44444444-4444-4444-a444-444444444444";

type QueryResult = { data: unknown; error: unknown };

/** Fechas relativas a "hoy" real (evita mockear Date): por_vencer cae dentro
 * de la ventana EXPIRY_WARNING_DAYS (60 días); vigente, muy lejos. */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const CERT_POR_VENCER = { status: "issued", valid_until: daysFromNow(10) };
const CERT_VIGENTE = { status: "issued", valid_until: daysFromNow(400) };

type SessionOpts = {
  user?: { id: string } | null;
  company?: QueryResult;
  cert?: QueryResult;
};

/** Cliente de sesión del cliente final: expone auth.getUser() y lee
 * company_client_view/certificates (RLS de Fase 0 acota a su empresa). */
function fakeSessionClient(opts: SessionOpts = {}) {
  const {
    user = { id: CLIENT_USER_ID },
    company = { data: { id: COMPANY_ID }, error: null },
    cert = { data: CERT_POR_VENCER, error: null },
  } = opts;

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => {
      if (table === "company_client_view") {
        return { select: () => ({ maybeSingle: () => Promise.resolve(company) }) };
      }
      if (table === "certificates") {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: () => Promise.resolve(cert) }),
            }),
          }),
        };
      }
      throw new Error(`tabla no mockeada en el test (session): ${table}`);
    }),
  };
}

type AdminOpts = {
  companyScore?: QueryResult;
  openRecert?: QueryResult;
  latestCycle?: QueryResult;
  assessmentInsert?: QueryResult;
  auditInsert?: QueryResult;
};

/** Cliente service-role: lee `companies.complexity_score`, chequea el ciclo
 * abierto `client_recert`, lee el último ciclo, inserta el nuevo
 * `assessments` y las dos entradas de `audit_log`. */
function fakeAdminClient(opts: AdminOpts = {}) {
  const {
    companyScore = { data: { complexity_score: 30 }, error: null },
    openRecert = { data: null, error: null },
    latestCycle = { data: { cycle: 1 }, error: null },
    assessmentInsert = { data: { id: ASSESSMENT_ID }, error: null },
    auditInsert = { data: null, error: null },
  } = opts;

  const insertFieldsSeen: unknown[] = [];
  const auditInsertsSeen: unknown[] = [];

  const companiesTable = {
    select: () => ({
      eq: () => ({ maybeSingle: () => Promise.resolve(companyScore) }),
    }),
  };

  let assessmentsSelectCall = 0;
  const assessmentsTable = {
    select: () => {
      assessmentsSelectCall += 1;
      const isOpenRecertCheck = assessmentsSelectCall % 2 === 1;
      const chainObj = {
        eq: () => chainObj,
        order: () => chainObj,
        limit: () => chainObj,
        maybeSingle: () =>
          Promise.resolve(isOpenRecertCheck ? openRecert : latestCycle),
      };
      return chainObj;
    },
    insert: (fields: unknown) => {
      insertFieldsSeen.push(fields);
      return {
        select: () => ({ single: () => Promise.resolve(assessmentInsert) }),
      };
    },
  };

  const auditTable = {
    insert: (fields: unknown) => {
      auditInsertsSeen.push(fields);
      return Promise.resolve(auditInsert);
    },
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "companies") return companiesTable;
      if (table === "assessments") return assessmentsTable;
      if (table === "audit_log") return auditTable;
      throw new Error(`tabla no mockeada en el test (admin): ${table}`);
    }),
    _insertFieldsSeen: insertFieldsSeen,
    _auditInsertsSeen: auditInsertsSeen,
  };
}

describe("requestRecertification", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("consentVersion inválido devuelve validation sin tocar supabase", async () => {
    const result = await requestRecertification("v0-old");
    expect(result).toEqual({ ok: false, error: "validation" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve unauthorized", async () => {
    const session = fakeSessionClient({ user: null });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await requestRecertification(RECERT_CONSENT_VERSION);
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("sin empresa (company_client_view null) devuelve unauthorized", async () => {
    const session = fakeSessionClient({ company: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await requestRecertification(RECERT_CONSENT_VERSION);
    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("certificado vigente devuelve not_eligible", async () => {
    const session = fakeSessionClient({ cert: { data: CERT_VIGENTE, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await requestRecertification(RECERT_CONSENT_VERSION);
    expect(result).toEqual({ ok: false, error: "not_eligible" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("sin certificado (sin_certificado) devuelve not_eligible", async () => {
    const session = fakeSessionClient({ cert: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await requestRecertification(RECERT_CONSENT_VERSION);
    expect(result).toEqual({ ok: false, error: "not_eligible" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("ya hay un ciclo client_recert abierto devuelve already_open", async () => {
    const session = fakeSessionClient();
    vi.mocked(createClient).mockResolvedValue(session as never);
    const admin = fakeAdminClient({
      openRecert: { data: { id: ASSESSMENT_ID }, error: null },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await requestRecertification(RECERT_CONSENT_VERSION);
    expect(result).toEqual({ ok: false, error: "already_open" });
    expect(admin._insertFieldsSeen).toHaveLength(0);
  });

  it("happy path score bajo: abre ciclo client_recert + audita + gate self_service_pending", async () => {
    const session = fakeSessionClient();
    vi.mocked(createClient).mockResolvedValue(session as never);
    const admin = fakeAdminClient({
      companyScore: { data: { complexity_score: 20 }, error: null },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await requestRecertification(RECERT_CONSENT_VERSION);

    expect(result).toEqual({ ok: true, gate: "self_service_pending" });
    // El score NUNCA aparece en el retorno.
    expect(JSON.stringify(result)).not.toContain("20");
    expect(JSON.stringify(result)).not.toContain("score");

    expect(admin._insertFieldsSeen).toEqual([
      {
        company_id: COMPANY_ID,
        cycle: 2,
        status: "open",
        origin: "client_recert",
      },
    ]);

    expect(admin._auditInsertsSeen).toEqual([
      expect.objectContaining({
        actor_id: CLIENT_USER_ID,
        action: "recert.consent_accepted",
        detail: { version: RECERT_CONSENT_VERSION, company_id: COMPANY_ID },
      }),
      expect.objectContaining({
        actor_id: CLIENT_USER_ID,
        action: "recert.requested",
        detail: {
          company_id: COMPANY_ID,
          assessment_id: ASSESSMENT_ID,
          gate: "self_service_pending",
        },
      }),
    ]);

    // El detalle auditado tampoco filtra el score/tramo interno.
    expect(JSON.stringify(admin._auditInsertsSeen)).not.toMatch(/"score"|"tier"/);
  });

  it("happy path score crítico (>=85): gate consultant_review", async () => {
    const session = fakeSessionClient();
    vi.mocked(createClient).mockResolvedValue(session as never);
    const admin = fakeAdminClient({
      companyScore: { data: { complexity_score: 90 }, error: null },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await requestRecertification(RECERT_CONSENT_VERSION);

    expect(result).toEqual({ ok: true, gate: "consultant_review" });
    expect(admin._auditInsertsSeen[1]).toEqual(
      expect.objectContaining({
        detail: expect.objectContaining({ gate: "consultant_review" }),
      }),
    );
  });
});
