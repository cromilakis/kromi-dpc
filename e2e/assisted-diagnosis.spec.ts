import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { computeRutDv, formatRut, isDummyRut } from "@/lib/companies/rut";

/**
 * E2E — diagnóstico asistido del consultor (/app/companies/new).
 *
 * No hay mocking de Supabase (convención del repo, ver .superpowers/sdd
 * task-5-brief.md): el setup crea/asegura un consultor real vía la API
 * admin (service role) contra el Supabase LOCAL, inicia sesión de verdad
 * por /login, y recorre el cuestionario completo (misma máquina de
 * `DiagnosisQuestionnaire` que el autodiagnóstico público) hasta persistir
 * la empresa + diagnóstico (`createCompanyWithDiagnosis`,
 * source="consultant_assisted").
 *
 * El consultor es idempotente (upsert, mismo email/password en cada
 * corrida): tolera reruns sin acumular usuarios de auth.users. El RUT sí
 * debe ser único por corrida (constraint unique en `companies.rut`), así
 * que se deriva del timestamp.
 */

// ---------------------------------------------------------------------------
// Setup: consultor real contra Supabase local (service role, no mock)
// ---------------------------------------------------------------------------

const CONSULTANT_EMAIL = "e2e-assisted-consultant@dpc.local";
const CONSULTANT_PASSWORD = "e2e-assisted-2026";
const CONSULTANT_FULL_NAME = "E2E Assisted Consultant";

/** Parseo mínimo de .env.local (mismo enfoque que scripts/create-consultant.mjs). */
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/** Crea (o reutiliza + resincroniza) el consultor de prueba vía admin API. */
async function ensureTestConsultant(): Promise<void> {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "[assisted-diagnosis.spec] faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: CONSULTANT_EMAIL,
    password: CONSULTANT_PASSWORD,
    email_confirm: true,
  });

  if (!createError) {
    userId = created.user.id;
  } else {
    const alreadyExists =
      createError.code === "email_exists" || /already/i.test(createError.message);
    if (!alreadyExists) {
      throw new Error(`[assisted-diagnosis.spec] createUser falló: ${createError.message}`);
    }
    const { data: list, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) {
      throw new Error(`[assisted-diagnosis.spec] listUsers falló: ${listError.message}`);
    }
    const existing = list.users.find(
      (candidate) => candidate.email?.toLowerCase() === CONSULTANT_EMAIL.toLowerCase(),
    );
    if (!existing) {
      throw new Error(
        `[assisted-diagnosis.spec] el usuario ${CONSULTANT_EMAIL} existe pero no se pudo recuperar.`,
      );
    }
    userId = existing.id;
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password: CONSULTANT_PASSWORD,
      email_confirm: true,
    });
    if (updateError) {
      throw new Error(`[assisted-diagnosis.spec] updateUserById falló: ${updateError.message}`);
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      { user_id: userId, full_name: CONSULTANT_FULL_NAME, role: "consultant" },
      { onConflict: "user_id" },
    );
  if (profileError) {
    throw new Error(`[assisted-diagnosis.spec] upsert en profiles falló: ${profileError.message}`);
  }
}

/** RUT válido y único por corrida (no "de relleno"), derivado del timestamp. */
function generateUniqueRut(): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const body = String(1_000_000 + ((Date.now() + attempt) % 8_999_999)).padStart(7, "0");
    if (isDummyRut(body)) continue;
    const dv = computeRutDv(body);
    return formatRut(`${body}${dv}`);
  }
  throw new Error("[assisted-diagnosis.spec] no se pudo generar un RUT único no-dummy");
}

// ---------------------------------------------------------------------------
// Helpers de interacción con el cuestionario
// ---------------------------------------------------------------------------

/**
 * Las opciones son `<label>` con un `<input>` sr-only + un `<span>` visible
 * (ver diagnosis-questionnaire.tsx): el input queda tapado por el span, así
 * que se hace click sobre el texto visible (el label nativo propaga el
 * click al input igual).
 */
async function clickOption(page: Page, label: string): Promise<void> {
  await page.getByText(label, { exact: true }).click();
}

/** Selecciona una opción de selección única (auto-avanza a la siguiente). */
async function selectSingle(page: Page, label: string): Promise<void> {
  await clickOption(page, label);
}

/** Selecciona una opción multi/allowCustom y confirma con "Continuar". */
async function selectAndContinue(page: Page, label: string): Promise<void> {
  await clickOption(page, label);
  await page.getByRole("button", { name: "Continuar" }).click();
}

test.describe("Diagnóstico asistido del consultor", () => {
  test.beforeAll(async () => {
    await ensureTestConsultant();
  });

  test("crea una empresa con diagnóstico persistido (source=consultant_assisted)", async ({
    page,
  }) => {
    const rut = generateUniqueRut();
    const companyName = `E2E Clínica Andes ${Date.now()}`;

    // ── Login real (server action signIn) ──────────────────────────────
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(CONSULTANT_EMAIL);
    await page.getByLabel("Contraseña").fill(CONSULTANT_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/app$/);

    // ── Alta de empresa: identidad ──────────────────────────────────────
    await page.goto("/app/companies/new");
    await page.getByLabel("Razón social").fill(companyName);
    await page.getByLabel("RUT").fill(rut);
    await page.getByLabel("RUT").blur();
    await page.getByLabel("Nombre del contacto").fill("QA Consultor");
    await page.getByLabel("Correo del contacto").fill("qa-contacto@example.com");
    await page.getByRole("button", { name: "Continuar" }).click();

    // ── Encuesta de diagnóstico (tamaño micro, rubro salud) ─────────────
    await selectSingle(page, "1 a 2 personas"); // S-001 tamaño
    await selectAndContinue(
      page,
      "Salud (clínica, terapia, laboratorio, farmacia)",
    ); // S-002 rubro (multi+custom) → activa DD-SALUD

    await selectAndContinue(
      page,
      "Software de ficha clínica electrónica especializado",
    ); // DD-SAL-001 (multi)
    await selectSingle(page, "15 años o más, o de forma permanente"); // DD-SAL-002
    await selectSingle(page, "En 5 días hábiles o menos"); // DD-SAL-003

    await selectSingle(
      page,
      "No, solo manejamos datos internos (empleados, proveedores)",
    ); // S-003 (ya no salta S-004: los datos internos también pueden ser sensibles)
    await selectSingle(
      page,
      "No, solo datos básicos (nombre, teléfono, correo, RUT)",
    ); // S-004 datos sensibles
    await selectSingle(page, "No, todo lo manejamos internamente"); // S-005 proveedores
    await selectAndContinue(page, "En papel / carpetas físicas"); // S-006 almacenamiento (multi)
    await selectSingle(page, "No usamos nube"); // S-007
    await selectSingle(page, "No tenemos página web ni formularios online"); // S-008
    await selectSingle(page, "No enviamos comunicaciones a clientes"); // S-009
    await selectSingle(page, "No tenemos cámaras"); // S-010
    await selectSingle(page, "No usamos datos biométricos"); // S-011
    await selectSingle(page, "No, todo está en Chile"); // S-012
    await selectSingle(page, "Menos de 6 meses"); // S-013
    await selectSingle(
      page,
      "Sí, tenemos claro dónde están y cómo eliminarlos",
    ); // S-014
    await selectSingle(
      page,
      "Sí, está publicado/accesible (web, local, documento)",
    ); // S-015 política de privacidad
    await selectSingle(
      page,
      "Sí, tenemos un inventario o registro actualizado",
    ); // S-016 inventario/RAT
    await selectSingle(page, "Sí, hay un responsable designado formalmente"); // S-017
    await selectSingle(
      page,
      "Sí, hay un canal definido y conocemos los plazos",
    ); // S-018 canal ARCOP
    await selectSingle(
      page,
      "Sí, tenemos un plan: contener, evaluar y notificar a quien corresponda",
    ); // S-019 incidentes → activa DD-INCIDENTES (todas las respuestas)
    await selectSingle(page, "No, ninguno que sepamos"); // DD-INC-001
    await selectSingle(page, "Sí, cada incidente queda documentado"); // DD-INC-002
    await selectSingle(
      page,
      "No, las decisiones siempre las toma una persona",
    ); // S-020 decisiones automatizadas
    await selectSingle(page, "No, solo manejamos datos propios"); // S-021 encargado
    await selectSingle(
      page,
      "Sí, con capacitaciones o inducciones formales",
    ); // S-022 capacitación — última pregunta, completa el diagnóstico

    // ── Guardar diagnóstico → redirige a /app/companies/<id> ────────────
    await page.getByRole("button", { name: "Guardar diagnóstico" }).click();
    await expect(page).toHaveURL(/\/app\/companies\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
  });
});
