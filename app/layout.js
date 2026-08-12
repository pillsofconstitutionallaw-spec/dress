import "./globals.css";
import Nav from "@/components/Nav";
import { BRAND } from "@/lib/data";

export const metadata = {
  title: `${BRAND} — consulenza d'immagine personalizzata`,
  description: `Scopri la tua palette personale, gli outfit più adatti e le migliori scelte di acquisto con ${BRAND}.`,
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
  appleWebApp: {
    capable: true,
    title: BRAND,
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#111213",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Outfit:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <footer style={{ borderTop: "1px solid var(--line)", marginTop: 96 }}>
          <div className="wrap" style={{ padding: "40px var(--pad)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <span className="eyebrow">{BRAND} · concept</span>
            <span className="muted" style={{ fontSize: 13 }}>Prototipo dimostrativo · un consiglio di stile, non una regola.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
