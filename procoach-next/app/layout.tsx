import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FutLab — Intel·ligència per a Entrenadors de Futbol Català",
    template: "%s | FutLab",
  },
  description:
    "La plataforma de referència del futbol regional català. Informes d'equip, anàlisi de rivals, apercibits, timing de gols i molt més. Dades oficials FCF.",
  keywords: [
    "futbol català", "FCF", "classificació", "resultats", "primera catalana",
    "segona catalana", "tercera catalana", "jugadors", "àrbitres", "entrenadors", "scouting",
  ],
  openGraph: {
    siteName: "FutLab",
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
    <html lang="ca">
      <body className="min-h-screen bg-[#0f172a] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
