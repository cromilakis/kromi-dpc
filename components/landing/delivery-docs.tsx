import { CheckCircleIcon } from "./icons";

/**
 * Documentación de entrega (sección "El entregable"): el expediente de
 * cumplimiento como pila de documentos + el detalle de qué contiene, en dos
 * ejes — QUÉ datos maneja la empresa (los que podrían ser objeto de
 * fiscalización) y CÓMO trata y protege cada uno. Es la prueba de tratamiento
 * que agiliza la fiscalización.
 *
 * Rediseño 2026-07-20: se reemplazó la escena WebGL (documento 3D con textura
 * canvas y estrellas hover) por una pila de papeles en HTML/CSS puro — más
 * fiel a lo que es un expediente, texto real accesible y sin costo de three.js
 * en esta sección. Hover: la pila se abanica apenas (motion-safe, CSS).
 * Server component; los textos llegan por props (i18n).
 */
export interface DeliveryGroup {
  heading: string;
  note: string;
  items: { name: string; desc: string }[];
}

/** Documento frontal del expediente: portada con el índice compacto. */
function DossierPaper({
  docTitle,
  docSubtitle,
  groups,
}: {
  docTitle: string;
  docSubtitle: string;
  groups: DeliveryGroup[];
}) {
  return (
    <div className="relative w-[272px] border border-stone bg-white shadow-[rgba(28,40,64,0.12)_0px_14px_32px_-16px]">
      {/* Lomo de tinta del documento */}
      <div aria-hidden className="h-[8px] bg-ink" />
      <div className="p-20">
        <div className="flex items-start justify-between gap-12">
          {/* Serif de titular (≥28px, regla de .kromi/design.md): la portada
              del expediente es un artefacto-documento, como certificate-card. */}
          <p className="font-serif text-[28px] font-medium leading-[1.1] tracking-[-0.5px] text-ink">
            {docTitle}
          </p>
          <span aria-hidden className="mt-[2px] shrink-0 text-ink">
            <CheckCircleIcon size={22} />
          </span>
        </div>
        <p className="mt-[6px] text-caption text-carbon">{docSubtitle}</p>
        <div className="mt-[16px] space-y-[14px] border-t border-ash pt-[14px]">
          {groups.map((g) => (
            <div key={g.heading}>
              <p className="text-caption font-bold uppercase tracking-[0.4px] text-carbon">
                {g.heading}
              </p>
              <ul className="mt-[8px] space-y-[8px]">
                {g.items.map((it) => (
                  <li
                    key={it.name}
                    className="flex items-center gap-[8px] text-[13px] font-medium text-ink"
                  >
                    <span
                      aria-hidden
                      className="h-[4px] w-[4px] shrink-0 rounded-full bg-lead"
                    />
                    {it.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DeliveryDocs({
  intro,
  docTitle,
  docSubtitle,
  groups,
}: {
  intro: string;
  docTitle: string;
  docSubtitle: string;
  groups: DeliveryGroup[];
}) {
  return (
    <div className="grid items-center gap-24 sm:grid-cols-2">
      {/* Pila de documentos: dos hojas detrás + la portada. En hover la pila
          se abanica apenas (solo transform, motion-safe). */}
      <div className="group flex min-h-[400px] items-center justify-center rounded-cards border border-stone bg-[#fbfbfc] px-24 py-32">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 rotate-[-5deg] border border-stone bg-white transition-transform duration-300 ease-out motion-safe:group-hover:rotate-[-7deg]"
          />
          <div
            aria-hidden
            className="absolute inset-0 rotate-[3deg] border border-stone bg-[#fdfdfd] transition-transform duration-300 ease-out motion-safe:group-hover:rotate-[5deg]"
          />
          <div className="relative transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-4">
            <DossierPaper
              docTitle={docTitle}
              docSubtitle={docSubtitle}
              groups={groups}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="max-w-[54ch] text-body-sm leading-[1.5] text-carbon">
          {intro}
        </p>
        <div className="mt-12 space-y-8">
          {groups.map((g) => (
            <div key={g.heading}>
              <p className="text-caption font-semibold uppercase tracking-[0.4px] text-ink">
                {g.heading}
              </p>
              <p className="mt-[2px] text-caption leading-[1.4] text-carbon">
                {g.note}
              </p>
              <ul className="mt-6 space-y-5">
                {g.items.map((it) => (
                  <li key={it.name} className="flex gap-8">
                    <span
                      aria-hidden
                      className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-ink"
                    />
                    <span>
                      <span className="block text-caption font-semibold text-ink">
                        {it.name}
                      </span>
                      <span className="mt-[2px] block text-caption leading-[1.5] text-carbon">
                        {it.desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
