import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicTopbar } from "@/components/self-assessment/public-topbar";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * /verify/[code] — verificación pública de certificados DPC
 * (RFC §11/§17: "Certificado privado DPC, verificable en línea").
 * Consulta el RPC verify_certificate(cert_code) con el cliente anon — único
 * acceso público permitido por la migración RLS (nunca acceso directo a
 * tablas). Estados: válido (datos públicos del certificado), no encontrado,
 * y "servicio no disponible" si falta env o falla la conexión (la página no
 * rompe el build ni el runtime sin Supabase configurado).
 */
export const dynamic = "force-dynamic";

interface CertificateRow {
  company_name: string;
  status: string;
  issued_at: string;
  valid_until: string;
}

type VerifyState =
  | { kind: "valid"; certificate: CertificateRow }
  | { kind: "notFound" }
  | { kind: "unavailable" };

const KNOWN_STATUSES = ["active", "expired", "revoked"] as const;

const STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  active: "positive",
  expired: "warning",
  revoked: "negative",
};

async function verifyCertificate(code: string): Promise<VerifyState> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error("[verify] Supabase sin configurar: faltan env NEXT_PUBLIC_SUPABASE_*.");
    return { kind: "unavailable" };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("verify_certificate", {
      cert_code: code,
    });
    if (error) {
      console.error("[verify] RPC verify_certificate falló:", error.message);
      return { kind: "unavailable" };
    }
    const rows = (data ?? []) as CertificateRow[];
    return rows.length > 0
      ? { kind: "valid", certificate: rows[0] }
      : { kind: "notFound" };
  } catch (cause) {
    console.error("[verify] servicio no disponible:", cause);
    return { kind: "unavailable" };
  }
}

/** Fechas date de Postgres (YYYY-MM-DD) en formato chileno, sin drift de TZ. */
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verify.meta");
  return { title: t("title"), description: t("description") };
}

interface VerifyPageProps {
  params: Promise<{ code: string }>;
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { code: rawCode } = await params;
  let code = rawCode;
  try {
    code = decodeURIComponent(rawCode);
  } catch {
    // Código con escapes malformados: se consulta tal cual llegó.
  }

  const [t, tCommon, state] = await Promise.all([
    getTranslations("verify"),
    getTranslations("common"),
    verifyCertificate(code),
  ]);

  const isKnownStatus = (status: string): boolean =>
    (KNOWN_STATUSES as readonly string[]).includes(status);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#fbfbfc]">
      <PublicTopbar
        logoAlt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
        tagline={tCommon("tagline")}
        backLabel={t("topbar.backToSite")}
      />
      {/* pt-[56px]: `pt-56` resolvía a 224px por la escala dinámica de spacing. */}
      <main
        id="main"
        className="mx-auto w-full max-w-[640px] flex-1 px-32 pb-80 pt-[56px] max-sm:px-16 max-sm:pt-32"
      >
        <header className="mb-32 text-center">
          {/* Eyebrow canónico ink — accent default del prototipo; overcast fallaba AA. */}
          <p className="mb-12 text-[13px] font-semibold text-ink">
            {t("eyebrow")}
          </p>
          <h1 className="font-serif text-heading font-medium leading-heading tracking-heading text-ink">
            {t("title")}
          </h1>
          <p className="mt-12 text-body-sm text-metal">
            {t("codeLabel")}{" "}
            <span className="rounded-tags bg-ash px-8 py-[2px] font-medium text-ink">
              {code}
            </span>
          </p>
        </header>

        {state.kind === "valid" ? (
          <section className="rounded-xl border border-stone bg-white p-[30px] shadow-subtle-2 max-sm:p-20">
            <h2 className="mb-20 text-body-sm font-semibold text-ink">
              {t("valid.title")}
            </h2>
            <dl className="flex flex-col">
              <div className="flex items-center justify-between gap-16 border-t border-ash py-12">
                <dt className="text-body-sm text-metal">{t("valid.companyLabel")}</dt>
                <dd className="text-body-sm font-semibold text-ink">
                  {state.certificate.company_name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-16 border-t border-ash py-12">
                <dt className="text-body-sm text-metal">{t("valid.statusLabel")}</dt>
                <dd>
                  <StatusBadge
                    pill
                    variant={STATUS_VARIANTS[state.certificate.status] ?? "neutral"}
                  >
                    {isKnownStatus(state.certificate.status)
                      ? t(`statuses.${state.certificate.status}`)
                      : t("statuses.unknown")}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-16 border-t border-ash py-12">
                <dt className="text-body-sm text-metal">{t("valid.issuedLabel")}</dt>
                <dd className="text-body-sm font-medium text-ink">
                  {formatDate(state.certificate.issued_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-16 border-y border-ash py-12">
                <dt className="text-body-sm text-metal">
                  {t("valid.validUntilLabel")}
                </dt>
                <dd className="text-body-sm font-medium text-ink">
                  {formatDate(state.certificate.valid_until)}
                </dd>
              </div>
            </dl>
            {/* Contraste AA en texto pequeño: carbon (≤13px), no overcast. */}
            <p className="mt-16 text-caption leading-caption text-carbon">
              {t("valid.note")}
            </p>
          </section>
        ) : null}

        {state.kind === "notFound" ? (
          /* Tintes semánticos negativos normalizados: familia danger-red
             (#f6e9e8 + borde danger-red/25), como hero y StatusBadge. */
          <section
            role="status"
            className="rounded-xl border border-danger-red/25 bg-[#f6e9e8] p-28 max-sm:p-20"
          >
            <h2 className="mb-8 text-body-sm font-semibold text-danger-red">
              {t("notFound.title")}
            </h2>
            <p className="text-body-sm leading-[1.55] text-ink">{t("notFound.text")}</p>
          </section>
        ) : null}

        {state.kind === "unavailable" ? (
          /* Borde de la familia warning-yellow (el #e8ddba anterior era un
             hex inventado fuera del sistema de tintes). */
          <section
            role="status"
            className="rounded-xl border border-warning-yellow/25 bg-[#f6f0df] p-28 max-sm:p-20"
          >
            <h2 className="mb-8 text-body-sm font-semibold text-warning-yellow">
              {t("unavailable.title")}
            </h2>
            <p className="text-body-sm leading-[1.55] text-ink">
              {t("unavailable.text")}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
