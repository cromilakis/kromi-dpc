import { afterEach, describe, expect, it, vi } from "vitest";

// Mismo patrón que test/proposals.test.ts: `createClient` (sesión del
// cliente autenticado) y `createAdminClient` (service-role) mockeados.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEvidenceDownloadUrl, uploadEvidence } from "@/lib/actions/portal-evidences";

// z.uuid() valida el nibble de variante RFC4122 (8/9/a/b en el 3er grupo).
const CLIENT_USER_ID = "22222222-2222-4222-a222-222222222222";
const COMPANY_ID = "33333333-3333-4333-a333-333333333333";
const CONTROL_ID = "44444444-4444-4444-a444-444444444444";
const EVIDENCE_ID = "55555555-5555-4555-a555-555555555555";

type QueryResult = { data: unknown; error: unknown };

/** Builder encadenable mínimo: métodos intermedios devuelven `this`, los
 * terminales (`maybeSingle`) resuelven `result`. */
function chain(result: QueryResult) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    maybeSingle: () => Promise.resolve(result),
  };
  return obj;
}

type SessionOpts = {
  user?: { id: string } | null;
  company?: QueryResult;
  control?: QueryResult;
  evidence?: QueryResult;
};

/** Cliente de sesión del cliente final: expone auth.getUser() y lee
 * company_client_view/controls/evidences (RLS de Fase 0 acota cada una a la
 * empresa del cliente). */
function fakeSessionClient(opts: SessionOpts = {}) {
  const {
    user = { id: CLIENT_USER_ID },
    company = { data: { id: COMPANY_ID }, error: null },
    control = { data: { id: CONTROL_ID }, error: null },
    evidence = { data: null, error: null },
  } = opts;

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => {
      if (table === "company_client_view") return chain(company);
      if (table === "controls") return chain(control);
      if (table === "evidences") return chain(evidence);
      throw new Error(`tabla no mockeada en el test (session): ${table}`);
    }),
  };
}

/** Tabla `evidences` del cliente service-role: select().eq().eq().eq().maybeSingle()
 * para el check de fila existente, insert()/update() para la escritura. */
function fakeAdminEvidencesTable(
  opts: {
    existing?: QueryResult;
    insertResult?: QueryResult;
    updateResult?: QueryResult;
  } = {},
) {
  const {
    existing = { data: null, error: null },
    insertResult = { data: { id: EVIDENCE_ID }, error: null },
    updateResult = { data: null, error: null },
  } = opts;
  const insertFieldsSeen: unknown[] = [];
  const updateFieldsSeen: unknown[] = [];

  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve(existing) }),
        }),
      }),
    }),
    insert: (fields: unknown) => {
      insertFieldsSeen.push(fields);
      return { select: () => ({ single: () => Promise.resolve(insertResult) }) };
    },
    update: (fields: unknown) => {
      updateFieldsSeen.push(fields);
      return { eq: () => Promise.resolve(updateResult) };
    },
    _insertFieldsSeen: insertFieldsSeen,
    _updateFieldsSeen: updateFieldsSeen,
  };
}

type AdminOpts = {
  evidencesTable?: ReturnType<typeof fakeAdminEvidencesTable>;
  uploadResult?: QueryResult;
  auditInsert?: QueryResult;
  signedUrlResult?: { data: { signedUrl: string } | null; error: unknown };
};

/** Cliente service-role: storage.from('evidences') (upload/createSignedUrl/
 * remove), from('evidences') (tabla) y from('audit_log'). */
function fakeAdminClient(opts: AdminOpts = {}) {
  const {
    evidencesTable = fakeAdminEvidencesTable(),
    uploadResult = { data: { path: "x" }, error: null },
    auditInsert = { data: null, error: null },
    signedUrlResult = {
      data: { signedUrl: "https://signed.example/download" },
      error: null,
    },
  } = opts;

  const storagePathsSeen: string[] = [];
  const upload = vi.fn((path: string) => {
    storagePathsSeen.push(path);
    return Promise.resolve(uploadResult);
  });
  const createSignedUrl = vi.fn().mockResolvedValue(signedUrlResult);
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    storage: { from: () => ({ upload, createSignedUrl, remove }) },
    from: vi.fn((table: string) => {
      if (table === "evidences") return evidencesTable;
      if (table === "audit_log") return { insert: () => Promise.resolve(auditInsert) };
      throw new Error(`tabla no mockeada en el test (admin): ${table}`);
    }),
    _storagePathsSeen: storagePathsSeen,
    _evidencesTable: evidencesTable,
  };
}

function smallPdfFormData(overrides: { controlId?: string; evidenceName?: string } = {}) {
  const fd = new FormData();
  fd.set("controlId", overrides.controlId ?? CONTROL_ID);
  fd.set("evidenceName", overrides.evidenceName ?? "Contrato DPA");
  fd.set("file", new File(["contenido"], "contrato.pdf", { type: "application/pdf" }));
  return fd;
}

describe("uploadEvidence", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Zod inválido (controlId no-uuid) devuelve validation sin tocar supabase", async () => {
    const fd = smallPdfFormData({ controlId: "no-es-uuid" });
    const result = await uploadEvidence(fd);
    expect(result).toEqual({ ok: false, error: "validation" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("evidenceName vacío devuelve validation", async () => {
    const fd = smallPdfFormData({ evidenceName: "" });
    const result = await uploadEvidence(fd);
    expect(result).toEqual({ ok: false, error: "validation" });
  });

  it("sin archivo devuelve validation", async () => {
    const fd = new FormData();
    fd.set("controlId", CONTROL_ID);
    fd.set("evidenceName", "Contrato DPA");
    const result = await uploadEvidence(fd);
    expect(result).toEqual({ ok: false, error: "validation" });
  });

  it("mime no permitido devuelve bad_type", async () => {
    const fd = new FormData();
    fd.set("controlId", CONTROL_ID);
    fd.set("evidenceName", "Contrato DPA");
    fd.set("file", new File(["x"], "virus.exe", { type: "application/x-msdownload" }));

    const result = await uploadEvidence(fd);
    expect(result).toEqual({ ok: false, error: "bad_type" });
  });

  it("archivo demasiado grande devuelve too_large", async () => {
    const fd = new FormData();
    fd.set("controlId", CONTROL_ID);
    fd.set("evidenceName", "Contrato DPA");
    const bigFile = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(bigFile, "size", { value: 52_428_800 + 1 });
    fd.set("file", bigFile);

    const result = await uploadEvidence(fd);
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("sin sesión devuelve unauthorized", async () => {
    const session = fakeSessionClient({ user: null });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await uploadEvidence(smallPdfFormData());
    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("sin empresa (current_company_id null) devuelve unauthorized", async () => {
    const session = fakeSessionClient({ company: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await uploadEvidence(smallPdfFormData());
    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("controlId fuera del catálogo devuelve not_found", async () => {
    const session = fakeSessionClient({ control: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await uploadEvidence(smallPdfFormData());
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("OK: sube al bucket bajo <company_id>/…, inserta con uploaded_by null y audita", async () => {
    const session = fakeSessionClient();
    vi.mocked(createClient).mockResolvedValue(session as never);
    const admin = fakeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await uploadEvidence(smallPdfFormData());

    expect(result).toEqual({ ok: true });

    // El path de Storage empieza con el company_id del cliente autenticado.
    expect(admin._storagePathsSeen).toHaveLength(1);
    expect(admin._storagePathsSeen[0].startsWith(`${COMPANY_ID}/`)).toBe(true);

    // Insert en `evidences` con company_id correcto y uploaded_by null.
    expect(admin._evidencesTable._insertFieldsSeen).toEqual([
      expect.objectContaining({
        company_id: COMPANY_ID,
        control_id: CONTROL_ID,
        name: "Contrato DPA",
        status: "missing",
        uploaded_by: null,
      }),
    ]);

    // audit_log con la acción específica de subida del cliente.
    expect(admin.from).toHaveBeenCalledWith("audit_log");
  });

  it("evidencia ya existente para (company,control,name): actualiza en vez de duplicar", async () => {
    const session = fakeSessionClient();
    vi.mocked(createClient).mockResolvedValue(session as never);
    const evidencesTable = fakeAdminEvidencesTable({
      existing: { data: { id: EVIDENCE_ID, version: 1 }, error: null },
    });
    const admin = fakeAdminClient({ evidencesTable });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await uploadEvidence(smallPdfFormData());

    expect(result).toEqual({ ok: true });
    expect(evidencesTable._insertFieldsSeen).toHaveLength(0);
    expect(evidencesTable._updateFieldsSeen).toEqual([
      expect.objectContaining({ version: 2, status: "missing" }),
    ]);
  });
});

describe("getEvidenceDownloadUrl", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sin sesión devuelve unauthorized", async () => {
    const session = fakeSessionClient({ user: null });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await getEvidenceDownloadUrl(EVIDENCE_ID);
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });

  it("evidencia inexistente o de otra empresa (RLS) devuelve not_found", async () => {
    const session = fakeSessionClient({ evidence: { data: null, error: null } });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await getEvidenceDownloadUrl(EVIDENCE_ID);
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("evidencia sin archivo aún (storage_path null) devuelve not_found", async () => {
    const session = fakeSessionClient({
      evidence: { data: { id: EVIDENCE_ID, storage_path: null }, error: null },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);

    const result = await getEvidenceDownloadUrl(EVIDENCE_ID);
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("OK: genera signed URL con service-role", async () => {
    const session = fakeSessionClient({
      evidence: {
        data: { id: EVIDENCE_ID, storage_path: `${COMPANY_ID}/${CONTROL_ID}-1-a.pdf` },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(session as never);
    const admin = fakeAdminClient();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await getEvidenceDownloadUrl(EVIDENCE_ID);
    expect(result).toEqual({ ok: true, url: "https://signed.example/download" });
  });
});
