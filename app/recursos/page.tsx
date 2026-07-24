import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getPublishedArticles } from "@/lib/resources/registry";
import type { ArticleType } from "@/lib/resources/types";

export const metadata: Metadata = {
  title: "Recursos sobre la Ley 21.719 y protección de datos",
  description:
    "Guías prácticas sobre la Ley 21.719 de protección de datos personales en Chile: cumplimiento, multas, RAT, derechos y contenido por rubro.",
  alternates: { canonical: "/recursos" },
};

/** Etiqueta editorial (kicker) según el tipo de artículo. */
const TYPE_LABEL: Record<ArticleType, string> = {
  pilar: "Guía esencial",
  satelite: "Guía",
  rubro: "Por sector",
};

export default function ResourcesIndexPage() {
  const articles = getPublishedArticles();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <LandingNav />
      <main
        id="main"
        className="mx-auto w-full max-w-[820px] flex-1 px-32 pt-[64px] pb-[96px] max-sm:px-16 max-sm:pt-[40px] max-sm:pb-[64px]"
      >
        <h1 className="text-balance font-serif text-heading-sm font-medium leading-[1.15] tracking-[-0.5px] text-ink">
          Recursos de protección de datos
        </h1>
        <p className="mt-12 max-w-[60ch] text-body leading-[1.55] text-carbon">
          Guías prácticas sobre la Ley 21.719 para entender qué exige y cómo cumplirla.
        </p>

        {articles.length === 0 ? (
          <p className="mt-40 text-body-sm text-metal">Próximamente.</p>
        ) : (
          // Feed editorial: cada recurso es una "cápsula de noticia" en una lista
          // vertical con separadores, no una tarjeta en grilla.
          <ul className="mt-32 divide-y divide-stone border-t border-stone">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/recursos/${a.slug}`}
                  className="group block py-28 max-sm:py-24"
                >
                  <span className="text-caption font-semibold uppercase tracking-[0.6px] text-metal">
                    {TYPE_LABEL[a.type]}
                  </span>
                  <h2 className="mt-8 text-balance font-serif text-subheading font-medium leading-[1.25] tracking-[-0.3px] text-ink decoration-slate decoration-1 underline-offset-4 group-hover:underline">
                    {a.title}
                  </h2>
                  <p className="mt-8 max-w-[68ch] text-body-sm leading-[1.6] text-carbon">
                    {a.description}
                  </p>
                  <span className="mt-12 inline-flex items-center gap-6 text-caption font-medium text-ink">
                    Leer la guía
                    <span
                      aria-hidden
                      className="transition-transform group-hover:translate-x-[3px]"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
