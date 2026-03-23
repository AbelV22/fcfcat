import type { Metadata } from "next";
import { Syne, Bebas_Neue, Bricolage_Grotesque } from 'next/font/google'
import "./globals.css";

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-bebas',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-headline',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: "NeoScout — Intel·ligència per a Entrenadors de Futbol Català",
    template: "%s | NeoScout",
  },
  description:
    "La plataforma de referència del futbol regional català. Informes d'equip, anàlisi de rivals, apercibits, timing de gols i molt més. Dades oficials FCF.",
  keywords: [
    "futbol català", "FCF", "classificació", "resultats", "primera catalana",
    "segona catalana", "tercera catalana", "jugadors", "àrbitres", "entrenadors", "scouting",
  ],
  openGraph: {
    siteName: "NeoScout",
    locale: "ca_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca" className={`${syne.variable} ${bebasNeue.variable} ${bricolage.variable}`}>
      <body className="min-h-screen bg-[#0f172a] text-slate-100 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
