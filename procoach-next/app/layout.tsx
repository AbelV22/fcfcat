import type { Metadata } from "next";
import Script from "next/script";
import { Syne, Bebas_Neue, Bricolage_Grotesque, Inter } from 'next/font/google'
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

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
  metadataBase: new URL("https://neoscout.es"),
  title: {
    default: "NeoScout — Resultats, Classificació i Estadístiques del Futbol Català",
    template: "%s | NeoScout",
  },
  description:
    "Resultats en directe, classificacions, estadístiques de jugadors, àrbitres i equips de totes les categories del futbol català: Segona Catalana, Tercera Catalana, Preferent Juvenil i més. Dades oficials FCF actualitzades.",
  keywords: [
    "futbol català", "resultats futbol català", "classificació futbol català",
    "FCF", "Federació Catalana de Futbol",
    "segona catalana", "tercera catalana", "primera catalana",
    "preferent juvenil", "juvenil primera divisió",
    "resultats segona catalana", "classificació tercera catalana",
    "estadístiques futbol català", "àrbitres futbol català",
    "jugadors futbol català", "equips futbol català",
    "gols futbol català", "targetes futbol català",
    "futbol amateur Catalunya", "futbol regional Catalunya",
    "lliga catalana futbol", "resultats FCF",
  ],
  openGraph: {
    siteName: "NeoScout",
    locale: "ca_ES",
    type: "website",
    title: "NeoScout — Resultats, Classificació i Estadístiques del Futbol Català",
    description: "La plataforma més completa del futbol regional català. Resultats, classificacions, estadístiques de jugadors i àrbitres de totes les categories FCF.",
    url: "https://neoscout.es",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeoScout — Futbol Català",
    description: "Resultats, classificacions i estadístiques de totes les categories del futbol català.",
  },
  alternates: {
    canonical: "https://neoscout.es",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // google: 'YOUR_GOOGLE_VERIFICATION_CODE', // TODO: afegir verificació Google Search Console
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca" className={`${syne.variable} ${bebasNeue.variable} ${bricolage.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-[#08090a] text-slate-100 antialiased overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "NeoScout",
              url: "https://neoscout.es",
              description: "Resultats, classificació i estadístiques del futbol català. Dades oficials FCF.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://neoscout.es/cerca?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
              inLanguage: "ca",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "NeoScout",
              url: "https://neoscout.es",
              logo: "https://neoscout.es/logo_neoscout.png",
              description: "Plataforma d'estadístiques i anàlisi del futbol regional català",
              sameAs: [],
            }),
          }}
        />
        {children}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "w3dxltswew");`}
        </Script>
      </body>
    </html>
  );
}
