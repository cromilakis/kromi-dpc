"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions de autenticación (spec auth, risk high).
 * Doctrina: Zod ANTES de tocar datos; mensajes de error genéricos que jamás
 * revelan si la cuenta existe (anti enumeración); redirect post-login solo a
 * rutas internas saneadas (safeNextPath). El acceso a datos queda además
 * protegido por RLS (solo perfiles del allowlist ven algo).
 * No se escribe audit_log aquí: el login no muta datos de negocio (la
 * doctrina lo exige en mutaciones sensibles); GoTrue ya registra los eventos
 * de auth en su propio log.
 */

const credentialsSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(200),
  next: z.string().max(2000).optional(),
});

export type SignInErrorCode = "validation" | "credentials" | "unavailable";
export type SignInState = { error: SignInErrorCode } | null;

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: "validation" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // 400 = credenciales inválidas (mensaje genérico, sin filtrar existencia);
    // cualquier otra cosa (red caída, 5xx) se comunica como no-disponible.
    return { error: error.status === 400 ? "credentials" : "unavailable" };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // Verificación de sesión en la action (defensa en profundidad): solo se
  // cierra una sesión que existe y es válida.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.auth.signOut();
  }
  redirect("/");
}
