import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
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
  title: "DPC — Data Protection Compliance",
  description:
    "Certifica la protección de datos personales en tu organización. Evaluación, diagnóstico y acompañamiento hacia el cumplimiento de la Ley 21.719.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
