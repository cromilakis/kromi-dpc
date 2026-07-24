import { absoluteUrl } from "@/lib/site";
import type { ResourceArticle } from "./types";

/** @graph con Article + FAQPage + BreadcrumbList para una página de recurso. */
export function articleJsonLd(article: ResourceArticle): object {
  const url = absoluteUrl(`/recursos/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: article.title,
        description: article.description,
        inLanguage: "es-CL",
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        author: { "@id": absoluteUrl("/#organization") },
        publisher: { "@id": absoluteUrl("/#organization") },
        mainEntityOfPage: url,
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: article.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Recursos", item: absoluteUrl("/recursos") },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
}
