import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { getTranslations } from "next-intl/server";
import {
  absoluteUrl,
  ORG_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

// Style Reference (.kromi/design.md): Inter para toda la UI (ss03 aplicado en
// globals.css); Newsreader como sustituto oficial de Tiempos Text para
// headlines >= 28px.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Cumplimiento de la Ley 21.719 de Protección de Datos | Kromi Privacy Center",
    template: "%s · KPC",
  },
  // Tono tercera persona/impersonal (init.md/RFC §16): sin tuteo en el copy.
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Ley 21.719",
    "protección de datos personales",
    "protección de datos Chile",
    "cumplimiento Ley 21.719",
    "autoevaluación protección de datos",
    "Agencia de Protección de Datos Personales",
    "RAT registro de actividades de tratamiento",
    "datos personales pyme",
  ],
  authors: [{ name: ORG_NAME }],
  creator: ORG_NAME,
  publisher: ORG_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: SITE_URL,
    siteName: SITE_NAME,
    title:
      "Cumplimiento de la Ley 21.719 de Protección de Datos | Kromi Privacy Center",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "KPC — Kromi Privacy Center · Cumplimiento de la Ley 21.719",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Cumplimiento de la Ley 21.719 de Protección de Datos | Kromi Privacy Center",
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  // Alta en Google Search Console: reemplazar por el token entregado por Google
  // (Propiedad → Etiqueta HTML) y descomentar.
  // verification: { google: "TOKEN_DE_SEARCH_CONSOLE" },
};

/** JSON-LD de sitio: identifica la organización y el sitio ante buscadores. */
function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: ORG_NAME,
        alternateName: "KPC",
        url: SITE_URL,
        logo: absoluteUrl("/kpc-logo.png"),
        description: SITE_DESCRIPTION,
        areaServed: { "@type": "Country", name: "Chile" },
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "es-CL",
        publisher: { "@id": absoluteUrl("/#organization") },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = await getTranslations("common");

  return (
    <html
      lang="es"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StructuredData />
        {/* Skip-link: primer elemento enfocable del documento; invisible salvo
            con foco de teclado. Cada página pública expone <main id="main">. */}
        <a
          href="#main"
          className="sr-only text-body-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-16 focus:top-16 focus:z-[60] focus:rounded-buttons focus:bg-ink focus:px-16 focus:py-8"
        >
          {t("skipToContent")}
        </a>
        {children}
      </body>
    </html>
  );
}
