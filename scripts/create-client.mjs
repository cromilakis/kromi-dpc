#!/usr/bin/env node
/**
 * Bootstrap del CLIENTE demo en el Supabase LOCAL (idempotente):
 * crea/actualiza el usuario en Auth (email confirmado, SIN fila en profiles —
 * un cliente no es staff) y le da una membresía activa en `company_members`
 * hacia una empresa con diagnóstico activo, de modo que /portal salga poblado
 * y sin paywall (fija `companies.service_paid_at` si hiciera falta).
 *
 * Estrategia de empresa (para no inventar datos legales):
 *   1. Si el usuario ya tiene membresía → se reutiliza (idempotente).
 *   2. Si existe una empresa con diagnóstico `active` → se une a ella (la más
 *      reciente) y se asegura que esté pagada.
 *   3. Si no hay ninguna → provisiona una empresa mínima "Cliente Demo KPC"
 *      pagada (el portal quedará sin brechas hasta que se le cargue un
 *      diagnóstico) y lo avisa.
 *
 * Uso:
 *   pnpm seed:client
 *   pnpm seed:client -- correo@dominio.cl mi-password
 *
 * Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local
 * (parseo manual, sin dotenv). SOLO para entorno local/desarrollo: la service
 * role key jamás debe usarse así contra producción.
 *
 * Guard de entorno (enforced): si la URL no apunta a 127.0.0.1/localhost el
 * script ABORTA, salvo --allow-remote explícito; y aun con el flag, contra un
 * destino remoto se exige contraseña por argumento (jamás la DEFAULT_PASSWORD,
 * que es pública en el repo).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_EMAIL = "cliente@dpc.local";
const DEFAULT_PASSWORD = "dpc-local-2026";
const FALLBACK_COMPANY_NAME = "Cliente Demo KPC";

/**
 * Aborta con mensaje. Se lanza (en vez de process.exit) para que Node cierre
 * los sockets de supabase-js con gracia — process.exit() con handles vivos
 * dispara un assert de libuv en Windows.
 */
function fail(message) {
  throw new Error(`[seed:client] ${message}`);
}

/** Parseo mínimo de .env.local: KEY=VALUE por línea, # comenta, comillas opcionales. */
function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    fail(`no se encontró ${envPath} (¿supabase start + .env.local configurado?).`);
  }
  const env = {};
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

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  fail("faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
}

const rawArgs = process.argv.slice(2);
const allowRemote = rawArgs.includes("--allow-remote");
const [emailArg, passwordArg] = rawArgs.filter((arg) => arg !== "--allow-remote");

/** Hosts considerados Supabase LOCAL (supabase start). */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

let targetHost;
try {
  targetHost = new URL(url).hostname;
} catch {
  fail(`NEXT_PUBLIC_SUPABASE_URL no es una URL válida: ${url}`);
}
const isLocalTarget = LOCAL_HOSTS.has(targetHost);

if (!isLocalTarget && !allowRemote) {
  fail(
    `la URL de destino (${targetHost}) no es local. Este script de bootstrap ` +
      `usa la service role key y por defecto SOLO opera contra 127.0.0.1/` +
      `localhost. Si realmente corresponde (p. ej. un staging), reintentar ` +
      `con --allow-remote y contraseña explícita.`,
  );
}

const email = emailArg ?? DEFAULT_EMAIL;
const password = passwordArg ?? DEFAULT_PASSWORD;

if (!isLocalTarget && (!passwordArg || passwordArg === DEFAULT_PASSWORD)) {
  fail(
    "destino remoto: pasar una contraseña propia por argumento " +
      "(la DEFAULT_PASSWORD del repo está prohibida fuera del entorno local).",
  );
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Crea el usuario o, si ya existe, sincroniza contraseña + confirmación. */
async function ensureUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) return { id: data.user.id, created: true };

  const alreadyExists =
    error.code === "email_exists" || /already/i.test(error.message);
  if (!alreadyExists) fail(`createUser falló: ${error.message}`);

  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) fail(`listUsers falló: ${listError.message}`);
  const existing = list.users.find(
    (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!existing) fail(`el usuario ${email} existe pero no se pudo recuperar.`);

  const { error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    { password, email_confirm: true },
  );
  if (updateError) fail(`updateUserById falló: ${updateError.message}`);
  return { id: existing.id, created: false };
}

/** Marca la empresa como pagada (desbloquea el paywall del portal) si no lo estaba. */
async function ensurePaid(companyId) {
  const { data: company, error } = await admin
    .from("companies")
    .select("service_paid_at")
    .eq("id", companyId)
    .single();
  if (error) fail(`lectura de companies falló: ${error.message}`);
  if (company.service_paid_at) return;
  const { error: updateError } = await admin
    .from("companies")
    .update({ service_paid_at: new Date().toISOString() })
    .eq("id", companyId);
  if (updateError) fail(`no se pudo marcar pagada la empresa: ${updateError.message}`);
}

/**
 * Resuelve a qué empresa se une el cliente:
 *  1) su membresía existente (idempotente),
 *  2) una empresa con diagnóstico activo (portal poblado),
 *  3) una empresa demo mínima recién provisionada (portal vacío).
 */
async function resolveCompany(userId) {
  const { data: membership } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membership) return { companyId: membership.company_id, reused: true, empty: false };

  const { data: diagnosed } = await admin
    .from("company_diagnoses")
    .select("company_id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (diagnosed) return { companyId: diagnosed.company_id, reused: false, empty: false };

  const { data: company, error } = await admin
    .from("companies")
    .insert({ name: FALLBACK_COMPANY_NAME })
    .select("id")
    .single();
  if (error || !company) fail(`no se pudo provisionar la empresa demo: ${error?.message}`);
  return { companyId: company.id, reused: false, empty: true };
}

try {
  const { id: userId, created } = await ensureUser();

  // Un cliente NO es staff: si el email quedó en el allowlist de profiles,
  // el ruteo por rol lo mandaría a /app en vez de /portal.
  const { data: staff } = await admin
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (staff) {
    fail(
      `el email ${email} tiene fila en profiles (staff): no puede ser cliente. ` +
        `Usar otro email para el cliente demo.`,
    );
  }

  const { companyId, reused, empty } = await resolveCompany(userId);
  await ensurePaid(companyId);

  if (!reused) {
    const { error: memberError } = await admin
      .from("company_members")
      .insert({ user_id: userId, company_id: companyId, invited_by: null, status: "active" });
    if (memberError) fail(`insert en company_members falló: ${memberError.message}`);
  }

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  console.log(
    `[seed:client] ${created ? "creado" : "actualizado"}: ${email} ` +
      `(user_id ${userId}) — ${reused ? "membresía reutilizada" : "membresía activa creada"} ` +
      `en "${company?.name}" (company_id ${companyId}, pagada).`,
  );
  console.log(`[seed:client] password: ${password}`);
  console.log(`[seed:client] destino tras login: /portal`);
  if (empty) {
    console.warn(
      `[seed:client] AVISO: la empresa demo no tiene diagnóstico activo; el ` +
        `portal se verá sin brechas hasta cargarle uno.`,
    );
  }
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
}
