import "./globals.css";
import Cornice from "@/components/Cornice";
import { BRAND } from "@/lib/data";

export const metadata = {
  title: `${BRAND} — la tua parte migliore`,
  description: `${BRAND} ti aiuta a tirare fuori la parte migliore di te: i tuoi colori, gli outfit che ti somigliano e dove trovarli.`,
  applicationName: BRAND,
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // iOS non legge il manifest: queste righe servono perché, aggiunta alla home,
  // l'app si apra a tutto schermo e col nome giusto sotto l'icona.
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Hanken+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* La cornice decide caso per caso: schermo pieno all'ingresso,
            barra in basso dentro l'app, intestazione e piè di pagina solo
            sulle due pagine che si aprono da un link. */}
        <Cornice>{children}</Cornice>
      </body>
    </html>
  );
}
