import Link from "next/link";
import { getArticle } from "@/lib/resources/registry";
import type { ResourceArticle } from "@/lib/resources/types";

/**
 * Vista de un artículo del centro de recursos. Estructura optimizada para
 * lectura, SEO y extracción por AI Overviews: H1 + resumen "En breve" + secciones
 * con H2 + FAQ + CTA a la autoevaluación + firma de autoría (E-E-A-T).
 */
export function ArticleView({ article }: { article: ResourceArticle }) {
  const related = article.related
    .map((slug) => getArticle(slug))
    .filter((a): a is ResourceArticle => a !== null && a.reviewed);

  return (
    <article className="mx-auto w-full max-w-[760px] px-32 pt-[64px] pb-[96px] max-sm:px-16 max-sm:pt-[40px] max-sm:pb-[64px]">
      <p className="text-caption font-medium uppercase tracking-[0.4px] text-metal">
        Recursos
      </p>
      <h1 className="mt-8 text-balance font-serif text-heading-sm font-medium leading-[1.15] tracking-[-0.5px] text-ink">
        {article.title}
      </h1>

      {/* Resumen "En breve" — lo que la IA extrae para AI Overviews. */}
      <div className="mt-24 rounded-cards border border-stone bg-ash/50 p-20">
        <p className="text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
          En breve
        </p>
        <p className="mt-6 text-body leading-[1.6] text-carbon">{article.summary}</p>
      </div>

      {article.sections.map((section, i) => (
        <section key={i} className="mt-32">
          <h2 className="font-serif text-subheading font-medium tracking-[-0.3px] text-ink">
            {section.heading}
          </h2>
          {section.paragraphs.map((p, j) => (
            <p key={j} className="mt-12 max-w-[68ch] text-body leading-[1.65] text-carbon">
              {p}
            </p>
          ))}
          {section.list && (
            <ListBlock ordered={section.list.ordered} items={section.list.items} />
          )}
        </section>
      ))}

      {/* CTA a la autoevaluación (conversión). */}
      <div className="mt-40 rounded-cards border border-stone bg-ash/60 p-24 max-sm:p-20">
        <h2 className="text-subheading font-semibold leading-[1.3] tracking-[-0.2px] text-ink">
          Descubre tus brechas en minutos
        </h2>
        <p className="mt-8 max-w-[62ch] text-body-sm leading-[1.55] text-carbon">
          La autoevaluación gratuita estima tu cumplimiento de la Ley 21.719 y te entrega un
          plan de mitigación priorizado. Sin registro, sin compromiso.
        </p>
        <Link
          href="/self-assessment"
          className="mt-16 inline-flex items-center gap-8 rounded-buttons bg-ink px-24 py-12 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Hacer la autoevaluación gratuita
        </Link>
      </div>

      {/* FAQ */}
      {article.faq.length > 0 && (
        <section className="mt-40">
          <h2 className="font-serif text-subheading font-medium tracking-[-0.3px] text-ink">
            Preguntas frecuentes
          </h2>
          <ul className="mt-16 flex flex-col gap-[10px]">
            {article.faq.map((f, i) => (
              <li key={i}>
                <details className="group rounded-cards border border-stone bg-white [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer list-none px-20 py-[16px] text-body font-semibold tracking-[-0.2px] text-ink">
                    {f.q}
                  </summary>
                  <p className="max-w-[70ch] px-20 pb-[16px] text-body-sm leading-[1.6] text-carbon">
                    {f.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Enlaces relacionados (enlazado interno del cluster). */}
      {related.length > 0 && (
        <section className="mt-40 border-t border-stone pt-24">
          <p className="text-caption font-semibold uppercase tracking-[0.4px] text-metal">
            Sigue leyendo
          </p>
          <ul className="mt-12 flex flex-col gap-8">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/recursos/${r.slug}`}
                  className="text-body-sm font-medium text-ink underline decoration-slate underline-offset-2 hover:decoration-ink"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Autoría E-E-A-T. */}
      <footer className="mt-40 border-t border-stone pt-20 text-caption text-metal">
        Revisado por {article.author.name} · {article.author.credential}. Última
        actualización: {article.dateModified}.
      </footer>
    </article>
  );
}

function ListBlock({ ordered, items }: { ordered: boolean; items: string[] }) {
  const cls = "mt-12 flex flex-col gap-6 pl-20 text-body leading-[1.6] text-carbon";
  return ordered ? (
    <ol className={`${cls} list-decimal`}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  ) : (
    <ul className={`${cls} list-disc`}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
