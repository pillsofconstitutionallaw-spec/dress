// ─────────────────────────────────────────────────────────────
// Cambia SOLO questa riga quando decidi il nome definitivo.
export const BRAND = "Dress";
// ─────────────────────────────────────────────────────────────

// Gli stili, raggruppati per famiglia.
//
// Il raggruppamento non è decorativo: settanta voci in un menù piatto non si
// leggono, e servono anche all'AI per capire che "Balletcore" e "Coquette"
// sono parenti, mentre "Techwear" sta da un'altra parte.
export const FAMIGLIE_STILI = [
  {
    famiglia: "Senza tempo",
    stili: ["Classico", "Minimal", "Sartoriale italiano", "Quiet luxury / Old money",
            "Preppy", "Ivy League", "British / Countryside", "Normcore", "Scandi", "Bon ton / Borghese", "Parisian chic", "Milanese", "Total black"],
  },
  {
    famiglia: "Tutti i giorni",
    stili: ["Casual", "Smart casual", "Business / Formale", "Business casual",
            "Loungewear / Comfort", "Athleisure / Sportivo", "Weekend", "Da viaggio", "Smart working"],
  },
  {
    famiglia: "Urbani e street",
    stili: ["Streetwear", "Skate", "Hip-hop", "Techwear", "Gorpcore / Outdoor",
            "Blokecore", "Utilitario / Workwear", "Militare", "Cargo", "Grime / UK street", "Surf", "Biker / Motociclista", "Sneakerhead", "Court / Basket"],
  },
  {
    famiglia: "Romantici",
    stili: ["Romantico", "Bohémien", "Cottagecore", "Coquette", "Balletcore",
            "Prairie", "Folk", "Lingerie-inspired", "Regencycore", "Shabby chic", "Whimsigoth"],
  },
  {
    famiglia: "Alternativi",
    stili: ["Grunge", "Rock / Edgy", "Punk", "Metal", "Goth", "Emo",
            "Dark academia", "Light academia", "Avant-garde", "Cyber", "Industrial", "Steampunk", "Visual kei", "E-girl / E-boy"],
  },
  {
    famiglia: "Retrò",
    stili: ["Vintage / Retrò", "Anni 50 / Pin-up", "Anni 60 / Mod", "Anni 70 / Disco",
            "Anni 80 / Power dressing", "Anni 90 / Minimal", "Y2K", "Rockabilly", "Anni 20 / Gatsby", "Anni 40", "Mid-century", "Vintage sportivo"],
  },
  {
    famiglia: "Di tendenza",
    stili: ["Clean girl", "Mob wife", "Office siren", "Tomboy", "Androgino",
            "Maximalista", "Colour blocking", "Monocromatico", "Logomania", "Oversize", "Barbiecore", "Tomato girl", "Coastal grandmother", "Indie sleaze"],
  },
  {
    famiglia: "Luoghi e atmosfere",
    stili: ["Coastal / Riviera", "Mediterraneo", "Western", "Safari", "Tropicale",
            "Urbano notturno", "Alpino", "Nordico", "Giapponese", "K-fashion", "Californiano", "New York minimal"],
  },
  {
    famiglia: "Occasioni",
    stili: ["Glam / Serata", "Red carpet", "Cerimonia", "Matrimonio invitato",
            "Primo appuntamento", "Colloquio", "Aperitivo", "Serata a teatro", "Laurea"],
  },
  {
    famiglia: "Con un'idea dietro",
    stili: ["Artsy", "Eclettico", "Sostenibile / Slow fashion", "Second-hand / Thrift",
            "Capsule wardrobe", "Uniform dressing"],
  },
  {
    famiglia: "Materiali e forme",
    stili: ["Denim su denim", "Pelle", "Maglieria", "Sartoria destrutturata",
            "Linee morbide", "Linee nette", "Trasparenze", "Tessuti naturali"],
  },
  {
    famiglia: "Codici di abbigliamento",
    stili: ["Black tie", "Cocktail", "Business formal", "Casual Friday",
            "Smart elegante", "Divisa personale"],
  },
];

// L'elenco piatto, per i menù e per i controlli.
export const STYLES = [
  "Non so ancora — aiutami a scoprirlo",
  ...FAMIGLIE_STILI.flatMap((f) => f.stili),
];

// Solo i nomi consigliabili dall'AI: senza il "non so", che è una risposta
// dell'utente, non uno stile.
export const STILI_CONSIGLIABILI = FAMIGLIE_STILI.flatMap((f) => f.stili);

export const HAIR = ["Neri", "Castano scuro", "Castano chiaro", "Biondi", "Rossi", "Grigi / Sale e pepe", "Bianchi", "Colorati"];
export const EYES = ["Marroni", "Nocciola", "Verdi", "Azzurri", "Grigi", "Ambra"];

export const OUTFIT_MODES = [
  { id: "elegante", label: "Elegante" },
  { id: "casual", label: "Casual" },
  { id: "smart", label: "Elegante + casual" },
  { id: "lavoro", label: "Lavoro" },
  { id: "sera", label: "Sera / Evento" },
];

// Retailer con flag fast fashion. I link puntano alla RICERCA del sito
// (deep-link): nessuna API, nessun costo, sempre aggiornato.
export const RETAILERS = [
  { name: "COS", fast: false, tier: "medio", search: (q) => `https://www.cos.com/en_eur/search.html?q=${encodeURIComponent(q)}` },
  { name: "Arket", fast: false, tier: "medio", search: (q) => `https://www.arket.com/en/search.html?q=${encodeURIComponent(q)}` },
  { name: "Massimo Dutti", fast: false, tier: "medio", search: (q) => `https://www.massimodutti.com/it/search?term=${encodeURIComponent(q)}` },
  { name: "Uniqlo", fast: false, tier: "accessibile", search: (q) => `https://www.uniqlo.com/it/it/search?q=${encodeURIComponent(q)}` },
  { name: "Zara", fast: true, tier: "accessibile", search: (q) => `https://www.zara.com/it/it/search?searchTerm=${encodeURIComponent(q)}` },
  { name: "H&M", fast: true, tier: "accessibile", search: (q) => `https://www2.hm.com/it_it/search-results.html?q=${encodeURIComponent(q)}` },
  { name: "Mango", fast: true, tier: "accessibile", search: (q) => `https://shop.mango.com/it/search?kw=${encodeURIComponent(q)}` },
  { name: "Vinted (second-hand)", fast: false, tier: "second-hand", search: (q) => `https://www.vinted.it/catalog?search_text=${encodeURIComponent(q)}` },
];

export function vintedListingUrl(q) {
  return `https://www.vinted.it/items/new?search_text=${encodeURIComponent(q)}`;
}

// Colori dell'anno (curati). Aggiornali a mano ogni stagione.
export const COLORS_OF_YEAR = [
  { name: "Terracotta calda", hex: "#B5654A", note: "Neutro caldo, sostituisce il nero nei mesi di mezzo." },
  { name: "Verde salvia", hex: "#9AA88B", note: "Riposante, sta con crema e denim." },
  { name: "Burro", hex: "#EDE3C8", note: "L'alternativa morbida al bianco ottico." },
  { name: "Blu inchiostro", hex: "#2B3A55", note: "Più profondo del navy, elegante di sera." },
  { name: "Marrone cacao", hex: "#5A4632", note: "La base terrosa dell'anno." },
  { name: "Rosa cipria", hex: "#D9B8B0", note: "Delicato senza essere infantile." },
];

// Offerte della settimana (curato/mock — sostituibile con affiliazione).
export const WEEKLY_OFFERS = [
  { retailer: "COS", deal: "Fino a -40% sulla maglieria", fast: false, url: "https://www.cos.com/en_eur/sale.html" },
  { retailer: "Arket", deal: "Selezione archivio scontata", fast: false, url: "https://www.arket.com/en/sale.html" },
  { retailer: "Uniqlo", deal: "Offerte limitate settimanali", fast: false, url: "https://www.uniqlo.com/it/it/spl/limited-offers" },
  { retailer: "Massimo Dutti", deal: "Nuovi ribassi stagione", fast: false, url: "https://www.massimodutti.com/it/saldi" },
  { retailer: "Vinted", deal: "Second-hand: il modo più etico di spendere meno", fast: false, url: "https://www.vinted.it/" },
];

export const FAST_FASHION_NOTE =
  "Il fast fashion produce enormi volumi a costi bassissimi grazie a cicli rapidissimi e prezzi compressi. " +
  "Questo si traduce spesso in impatto ambientale elevato (acqua, microplastiche, rifiuti tessili), pressione sui lavoratori della filiera e capi poco durevoli. " +
  "Non è un divieto: è un'informazione. Comprare meno e meglio, o usato, riduce l'impatto.";
