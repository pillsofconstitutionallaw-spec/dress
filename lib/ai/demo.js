import { fallbackPalette } from "@/lib/fallback";
import { vintedListingUrl } from "@/lib/data";

// Provider "demo": nessuna AI, risultati d'esempio. Serve per girare a costo zero.
export const demo = {
  name: "demo",

  async analyzeColor({ profile = {} } = {}) {
    return {
      season: "Analisi dimostrativa (attiva una chiave AI per l'analisi reale)",
      styleReading: null,
      palette: fallbackPalette(profile).slice(0, 5),
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
