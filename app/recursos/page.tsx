import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getPublishedArticles } from "@/lib/resources/registry";

export const metadata: Metadata = {
  title: "Recursos sobre la Ley 21.719 y protección de datos",
  description:
    "Guías prácticas sobre la Ley 21.719 de protección de datos personales en Chile: cumplimiento, multas, RAT, derechos y contenido por rubro.",
  alternates: { canonical: "/recursos" },
};

export default function ResourcesIndexPage() {
  const articles = getPublishedArticles();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <LandingNav />
      <main
        id="main"
        className="mx-auto w-full max-w-[960px] flex-1 px-32 py-64 max-sm:px-16 max-sm:py-40"
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
          <ul className="mt-40 grid grid-cols-1 gap-16 sm:grid-cols-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/recursos/${a.slug}`}
                  className="block h-full rounded-cards border border-stone bg-white p-20 transition-colors hover:bg-ash"
                >
                  <span className="text-body font-semibold leading-[1.3] text-ink">
                    {a.title}
                  </span>
                  <span className="mt-8 block text-body-sm leading-[1.5] text-carbon">
                    {a.description}
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
