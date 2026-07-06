import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { PrintGuideButton } from "@/components/interview/print-guide-button";
import { loadInterviewGuide } from "@/lib/interview/load-guide.server";
import { createClient } from "@/lib/supabase/server";

/**
 * /app/companies/[id]/diagnosis/guide — vista imprimible del guion de
 * entrevista (spec `2026-07-05-interview-guide-design.md`, Task 4). Reusa
 * `loadInterviewGuide` (mismo criterio de aplicabilidad que el panel de la
 * Task 3, ya solo controles aplicables a la empresa) y el nombre de la
 * empresa. Sin score ni datos internos — es un documento para llevar a la
 * reunión.
 *
 * Esta ruta vive bajo `/app` y por lo tanto hereda el shell del layout
 * (`app/app/layout.tsx`: sidebar + topbar). Para que la impresión NO
 * incluya ese shell, se usa el truco clásico de `@media print`:
 * `body * { visibility: hidden }` esconde TODO el árbol (incluida la
 * sidebar/topbar, que son hermanos de `<main>` y no elementos que esta
 * página pueda controlar directamente) y `.print-guide, .print-guide * {
 * visibility: visible }` vuelve a mostrar únicamente este contenido.
 * `.print-guide` se saca del flujo (`position: absolute; inset: 0`) porque
 * el resto de elementos siguen ocupando su espacio de layout aunque sean
 * invisibles (`visibility: hidden` no colapsa la caja, a diferencia de
 * `display: none`); sin esto quedaría un hueco en blanco donde estaba la
 * sidebar. Es la alternativa más simple y robusta sin tocar el layout
 * compartido con el resto de `/app` (que sí necesita su shell en pantalla).
 */

const companyIdSchema = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.diagnosis.guide");
  return { title: t("title") };
}

export default async function InterviewGuidePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // id que no es UUID (URL manipulada) → 404 sin tocar la base.
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [t, companyRes, guide] = await Promise.all([
    getTranslations("app.diagnosis.guide"),
    supabase.from("companies").select("id, name").eq("id", id).maybeSingle(),
    loadInterviewGuide(id),
  ]);

  if (companyRes.error) {
    throw new Error(`No fue posible cargar la empresa: ${companyRes.error.message}`);
  }
  if (!companyRes.data) notFound();

  const questionCount = guide.reduce(
    (total, domain) =>
      total + domain.controls.reduce((sum, control) => sum + control.questions.length, 0),
    0,
  );

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property -- <style> plano, sin styled-jsx */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-guide,
          .print-guide * {
            visibility: visible;
          }
          .print-guide {
            position: absolute;
            inset: 0;
            width: 100%;
            padding: 0;
            max-width: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="print-guide mx-auto max-w-[720px]">
        <div className="mb-20 flex justify-end">
          <PrintGuideButton label={t("print")} />
        </div>

        <header className="mb-32 border-b border-stone pb-20">
          <p className="text-caption uppercase tracking-wide text-carbon">
            {companyRes.data.name}
          </p>
          <h1 className="mt-4 text-heading-sm font-semibold text-ink">{t("title")}</h1>
          <p className="mt-8 text-body-sm leading-body-sm tracking-body-sm text-carbon">
            {t("subtitle")}
          </p>
          <p className="mt-8 text-caption leading-caption text-metal">
            {t("counter", { domains: guide.length, questions: questionCount })}
          </p>
        </header>

        {guide.length === 0 ? (
          <p className="text-body-sm leading-body-sm tracking-body-sm text-metal">
            {t("empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-32">
            {guide.map((domain) => (
              <section key={domain.domainCode} className="break-inside-avoid">
                <h2 className="mb-12 text-body font-semibold text-ink">{domain.domainName}</h2>
                <div className="flex flex-col gap-20">
                  {domain.controls.map((control) => (
                    <div
                      key={control.code}
                      className="break-inside-avoid border-t border-ash pt-12 first:border-t-0 first:pt-0"
                    >
                      <span className="text-[11px] font-semibold leading-[1.5] text-carbon">
                        {control.code}
                      </span>
                      <h3 className="text-body-sm font-semibold text-ink">{control.name}</h3>

                      {control.questions.length > 0 ? (
                        <ul className="mt-8 flex list-disc flex-col gap-4 pl-16">
                          {control.questions.map((question, index) => (
                            <li key={index} className="text-body-sm text-carbon">
                              {question}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {control.criteria.length > 0 ? (
                        <p className="mt-8 text-caption leading-caption text-metal">
                          {t("criteriaLabel")}: {control.criteria.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
