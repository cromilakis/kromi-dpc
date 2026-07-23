import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { getTranslations } from "next-intl/server";
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
  title: "KPC — Kromi Privacy Center",
  // Tono tercera persona/impersonal (init.md/RFC §16): sin tuteo en el copy.
  description:
    "KPC acompaña a las organizaciones en la evaluación, el diagnóstico y la certificación del cumplimiento de la Ley 21.719.",
};

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
