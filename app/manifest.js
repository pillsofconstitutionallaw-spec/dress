import { BRAND } from "@/lib/data";

// Descrive l'app quando viene aggiunta alla schermata home del telefono:
// nome sotto l'icona, colori e apertura a tutto schermo senza barra del browser.
export default function manifest() {
  return {
    name: `${BRAND} — consulenza d'immagine`,
    short_name: BRAND,
    description: "La tua palette personale, gli outfit adatti e dove comprarli.",
    lang: "it",
    // L'app parte dall'accesso, che ora è la prima pagina: chi ha scaricato
    // l'app ha già deciso, non deve essere convinto un'altra volta.
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android ritaglia questa a cerchio o a goccia: ha più margine intorno.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Analisi colori", url: "/start" },
      { name: "Il tuo spazio", url: "/dashboard" },
    ],
  };
}
