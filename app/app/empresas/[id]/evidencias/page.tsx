import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";
import { EvidenceFilters } from "@/components/evidences/evidence-filters";
import { EvidenceRowActions } from "@/components/evidences/evidence-row-actions";
import { UploadEvidenceForm } from "@/components/evidences/upload-evidence-form";
import { PageHeader } from "@/components/app/shell";
import {
  Card,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type StatusBadgeVariant,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/types";

/**
 * /app/empresas/[id]/evidencias — Repositorio documental (prototipo §1.4.10,
 * spec evidencias, data_level sensitive). Server component con cliente
 * AUTENTICADO (RLS autoriza consultores): summary-cards, formulario de subida
 * real a Storage privado, filtros por estado/control vía searchParams y tabla
 * (documento, control, versión, estado, fecha, subido por, acciones).
 * Estados de datos: carga (loading.tsx), vacío, sin resultados de filtro y
 * error (throw → app/app/error.tsx).
 */

const companyIdSchema = z.uuid();

const filtersSchema = z.object({
  estado: z.enum(Constants.public.Enums.evidence_status).optional(),
  // "none" = evidencias sin control vinculado.
  control: z.union([z.uuid(), z.literal("none")]).optional(),
});

/** Enum de BD → variante semántica del StatusBadge (prototipo §3.5). */
const STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  validated: "positive",
  partial: "warning",
  missing: "negative",
  rejected: "negative",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.evidences.meta");
  return { title: t("title") };
}

interface EvidencesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EvidencesPage({
  params,
  searchParams,
}: EvidencesPageProps) {
  const [{ id }, rawSearchParams] = await Promise.all([params, searchParams]);
  if (!companyIdSchema.safeParse(id).success) notFound();

  // Filtros por searchParams: valores inválidos ⇒ filtro ignorado (sin 500).
  const parsedFilters = filtersSchema.safeParse({
    estado:
      typeof rawSearchParams.estado === "string" ? rawSearchParams.estado : undefined,
    control:
      typeof rawSearchParams.control === "string" ? rawSearchParams.control : undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  const supabase = await createClient();
  const [t, format, companyResult, evidencesResult, controlsResult] = await Promise.all([
    getTranslations("app.evidences"),
    // Formateo de fechas por next-intl (locale global), no Intl hardcodeado.
    getFormatter(),
    supabase.from("companies").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("evidences")
      .select(
        "id, name, version, status, storage_path, created_at, control_id, controls ( id, code, name ), profiles ( full_name )",
      )
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("controls").select("id, code, name").order("code"),
  ]);

  // Fallas de lectura → error boundary del shell (app/app/error.tsx).
  if (companyResult.error) {
    throw new Error(`No fue posible cargar la empresa: ${companyResult.error.message}`);
  }
  if (!companyResult.data) notFound();
  if (evidencesResult.error) {
    throw new Error(
      `No fue posible cargar las evidencias: ${evidencesResult.error.message}`,
    );
  }
  if (controlsResult.error) {
    throw new Error(
      `No fue posible cargar el catálogo de controles: ${controlsResult.error.message}`,
    );
  }

  const company = companyResult.data;
  const allEvidences = evidencesResult.data ?? [];
  const controls = controlsResult.data ?? [];

  // Summary-cards del prototipo sobre el repositorio COMPLETO (sin filtros).
  const summary = [
    { key: "documents", value: allEvidences.length },
    {
      key: "validated",
      value: allEvidences.filter((row) => row.status === "validated").length,
    },
    {
      key: "pending",
      value: allEvidences.filter((row) => row.status === "partial").length,
    },
    {
      key: "rejected",
      value: allEvidences.filter((row) => row.status === "rejected").length,
    },
  ] as const;

  const evidences = allEvidences.filter((row) => {
    if (filters.estado && row.status !== filters.estado) return false;
    if (filters.control === "none") return row.control_id === null;
    if (filters.control) return row.control_id === filters.control;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { company: company.name })}
        title={t("title")}
        description={t("description")}
      />

      <div className="mb-24 grid grid-cols-4 gap-16 max-lg:grid-cols-2">
        {summary.map((item) => (
          <Card key={item.key}>
            <p className="text-caption leading-caption tracking-caption text-carbon">
              {t(`summary.${item.key}`)}
            </p>
            <p className="mt-4 text-[28px] font-semibold leading-[1.2] tracking-[-0.9px] text-ink">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <UploadEvidenceForm companyId={company.id} controls={controls} />

      <EvidenceFilters
        statuses={[...Constants.public.Enums.evidence_status]}
        controls={controls}
        currentStatus={filters.estado ?? ""}
        currentControl={filters.control ?? ""}
      />

      {allEvidences.length === 0 ? (
        <Card role="status" className="py-40 text-center">
          <p className="text-body-sm font-semibold text-ink">{t("empty.title")}</p>
          <p className="mx-auto mt-4 max-w-[420px] text-body-sm text-metal">
            {t("empty.text")}
          </p>
        </Card>
      ) : evidences.length === 0 ? (
        <Card role="status" className="py-40 text-center">
          <p className="text-body-sm font-semibold text-ink">{t("noResults.title")}</p>
          <p className="mx-auto mt-4 max-w-[420px] text-body-sm text-metal">
            {t("noResults.text")}
          </p>
        </Card>
      ) : (
        <Card padded={false}>
          <div className="flex items-baseline justify-between gap-16 border-b border-stone px-[18px] py-12">
            <h2 className="text-body-sm font-semibold text-ink">{t("table.title")}</h2>
            <p className="text-caption leading-caption text-carbon">
              {t("table.count", { count: evidences.length })}
            </p>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("table.document")}</TableHeaderCell>
                <TableHeaderCell>{t("table.control")}</TableHeaderCell>
                <TableHeaderCell>{t("table.version")}</TableHeaderCell>
                <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                <TableHeaderCell>{t("table.date")}</TableHeaderCell>
                <TableHeaderCell>{t("table.uploadedBy")}</TableHeaderCell>
                <TableHeaderCell>{t("table.actions")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {evidences.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex items-center gap-12">
                      {/* Icono de archivo del prototipo: cuadrado 28px Ash. */}
                      <span
                        aria-hidden="true"
                        className="flex size-[28px] shrink-0 items-center justify-center rounded-tags bg-ash"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4 1.5h5.5L13 5v9.5H4v-13z"
                            stroke="#505967"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <path d="M9.5 1.5V5H13" stroke="#505967" strokeWidth="1.4" />
                        </svg>
                      </span>
                      <span className="max-w-[260px] truncate font-medium" title={row.name}>
                        {row.name}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.controls ? (
                      <span title={row.controls.name}>{row.controls.code}</span>
                    ) : (
                      <span className="text-metal">{t("table.none")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t("table.versionShort", { version: row.version })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[row.status] ?? "neutral"}>
                      {t(`statuses.${row.status}`)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {/* En UTC: fecha estable sin drift de zona horaria. */}
                    {format.dateTime(new Date(row.created_at), {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </TableCell>
                  <TableCell>
                    {row.profiles?.full_name ?? (
                      <span className="text-metal">{t("table.none")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <EvidenceRowActions
                      evidenceId={row.id}
                      name={row.name}
                      status={row.status}
                      hasFile={Boolean(row.storage_path)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
