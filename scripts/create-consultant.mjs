#!/usr/bin/env node
/**
 * Bootstrap del consultor demo en el Supabase LOCAL (idempotente):
 * crea/actualiza el usuario en Auth (email confirmado) y hace upsert de su
 * fila en public.profiles con role 'consultant' (allowlist del equipo).
 *
 * Uso:
 *   pnpm seed:consultant
 *   pnpm seed:consultant -- correo@dominio.cl mi-password "Nombre Apellido"
 *
 * Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local
 * (parseo manual, sin dotenv). SOLO para entorno local/desarrollo: la service
 * role key jamás debe usarse así contra producción.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_EMAIL = "consultor@dpc.local";
const DEFAULT_PASSWORD = "dpc-local-2026";
const DEFAULT_FULL_NAME = "Consultor Demo";

/**
 * Aborta con mensaje. Se lanza (en vez de process.exit) para que Node cierre
 * los sockets de supabase-js con gracia — process.exit() con handles vivos
 * dispara un assert de libuv en Windows.
 */
function fail(message) {
  throw new Error(`[seed:consultant] ${message}`);
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

const [, , emailArg, passwordArg, nameArg] = process.argv;
const email = emailArg ?? DEFAULT_EMAIL;
const password = passwordArg ?? DEFAULT_PASSWORD;
const fullName = nameArg ?? DEFAULT_FULL_NAME;

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

try {
  const { id, created } = await ensureUser();

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      { user_id: id, full_name: fullName, role: "consultant" },
      { onConflict: "user_id" },
    );
  if (profileError) fail(`upsert en profiles falló: ${profileError.message}`);

  console.log(
    `[seed:consultant] ${created ? "creado" : "actualizado"}: ${email} ` +
      `(user_id ${id}) — profile "${fullName}" role=consultant.`,
  );
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
}
