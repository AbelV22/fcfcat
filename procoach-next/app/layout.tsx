import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FCFCat — Futbol Català en Temps Real",
    template: "%s | FCFCat",
  },
  description:
    "La plataforma de referència del futbol regional català. Classificacions, resultats, perfils de jugadors, estadístiques d'àrbitres i molt més. Tota la FCF en un sol lloc.",
  keywords: [
    "futbol català", "FCF", "classificació", "resultats", "primera catalana",
    "segona catalana", "tercera catalana", "jugadors", "àrbitres", "scouting",
  ],
  openGraph: {
    siteName: "FCFCat",
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
