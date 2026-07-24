import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ArticleView } from "@/components/resources/article-view";
import { getArticle, getPublishedArticles } from "@/lib/resources/registry";
import { articleJsonLd } from "@/lib/resources/structured-data";

export function generateStaticParams() {
  return getPublishedArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article || !article.reviewed) return {};
  const canonical = `/recursos/${article.slug}`;
  return {
    title: article.metaTitle,
    description: article.description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: article.metaTitle,
      description: article.description,
      images: ["/og.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle,
      description: article.description,
      images: ["/og.png"],
    },
  };
}

export default async function ResourceArticlePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article || !article.reviewed) notFound();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(article)) }}
      />
      <LandingNav />
      <main id="main" className="flex-1">
        <ArticleView article={article} />
      </main>
      <LandingFooter />
    </div>
  );
}
