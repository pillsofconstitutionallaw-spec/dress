import { fallbackPalette } from "@/lib/fallback";
import { vintedListingUrl } from "@/lib/data";

// Stili d'esempio: partono da quello dichiarato, così anche senza AI il
// consiglio non è del tutto scollegato da chi ha compilato il questionario.
function stiliDimostrativi(profile = {}) {
  const dichiarato = String(profile.style || "").trim();
  const base = [
    { nome: "Minimal", perche: "Poche linee pulite e colori pieni: è la base che regge tutto il resto.", capi: ["camicia bianca in cotone", "pantalone dritto scuro", "sneaker bianche minimal"] },
    { nome: "Smart casual", perche: "Sta in piedi in ufficio e a cena, ed è la combinazione che si usa di più.", capi: ["blazer destrutturato", "jeans dritti scuri", "mocassini in pelle"] },
    { nome: "Classico", perche: "Capi che non passano di moda e si abbinano fra loro senza pensarci.", capi: ["trench beige", "maglia girocollo in lana", "camicia azzurra"] },
  ];
  const conDichiarato = dichiarato && !/non so/i.test(dichiarato)
    ? [{ nome: dichiarato, perche: "Lo stile che hai indicato tu: partiamo da lì.", capi: [] }, ...base]
    : base;
  return conDichiarato.slice(0, 5);
}

// Provider "demo": nessuna AI, risultati d'esempio. Serve per girare a costo zero.
export const demo = {
  name: "demo",

  async analyzeColor({ profile = {} } = {}) {
    return {
      season: "Analisi dimostrativa (attiva una chiave AI per l'analisi reale)",
      styleReading: null,
      palette: fallbackPalette(profile).slice(0, 5),
      stili: stiliDimostrativi(profile),
    };
  },

  async resell() {
    const title = "Capo in buone condizioni";
    return {
      title,
      category: "—",
      description:
        "Capo versatile e facile da abbinare, in buone condizioni generali. Vestibilità regolare. Ottimo per un look quotidiano curato. (Descrizione dimostrativa: attiva una chiave AI per generarla dalla foto.)",
      priceRange: "12–20 €",
      matchTips: [
        "Abbinalo a un neutro di base (crema, grigio o cammello) per farlo risaltare.",
        "Spezza con un accessorio in pelle marrone per un tocco più curato.",
        "Per un look casual: jeans dritti e sneaker minimal bianche.",
      ],
      vintedUrl: vintedListingUrl(title),
    };
  },
};
