import { notFound } from "next/navigation";
import { z } from "zod";
import { CompanyScope, type ShellCompany } from "@/components/app/shell";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout del modo "Empresa" del shell (/app/empresas/[id]/…): carga la
 * empresa en servidor (cliente AUTENTICADO — RLS autoriza consultores) y la
 * publica al sidebar/topbar vía CompanyScope (bloque de contexto: nombre,
 * rubro, fase con StatusBadge). Los 7 ítems del nav (Resumen, Checklist,
 * Riesgos, Soluciones, Plan, Evidencias, Certificación) los renderiza el
 * sidebar del layout padre al detectar este segmento en el pathname; las
 * páginas de cada módulo se crean en sus propias specs.
 */

const companyIdSchema = z.uuid();

/** Iniciales (2 letras) del avatar cuadrado del prototipo ({{ current.in }}). */
function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0]![0]}${words[1]![0]}`
      : (words[0] ?? "").slice(0, 2);
  return initials.toUpperCase() || "·";
}

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // id que no es UUID (URL manipulada) → 404 sin tocar la base.
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, phase, complexity_score, sectors ( name )")
    .eq("id", id)
    .maybeSingle();

  // Falla de infraestructura/permiso → error boundary (app/app/error.tsx).
  if (error) {
    throw new Error(`No fue posible cargar la empresa: ${error.message}`);
  }
  if (!company) notFound();

  const shellCompany: ShellCompany = {
    id: company.id,
    name: company.name,
    initials: companyInitials(company.name),
    sectorName: company.sectors?.name ?? null,
    phase: company.phase,
    complexityScore: company.complexity_score,
  };

  return <CompanyScope company={shellCompany}>{children}</CompanyScope>;
}
