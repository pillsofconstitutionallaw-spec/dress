// Risultati di esempio, usati quando manca la chiave o l'AI non risponde.
// Servono a far girare la demo end-to-end senza costi.

export function fallbackPalette(profile = {}) {
  const warm = ["Biondi", "Rossi", "Castano chiaro"].includes(profile.hair);
  const base = warm
    ? [
        { name: "Crema burro", hex: "#EDE3C8", why: "Illumina gli incarnati caldi senza spegnere." },
        { name: "Cammello", hex: "#B79268", why: "Neutro caldo, il tuo nuovo beige di base." },
        { name: "Terracotta", hex: "#B5654A", why: "Riprende i toni dei capelli e scalda il viso." },
        { name: "Verde oliva", hex: "#6E7050", why: "Contrasto naturale che valorizza gli occhi." },
        { name: "Ruggine", hex: "#8A4B2F", why: "Per gli accenti: sciarpe, maglieria, accessori." },
        { name: "Denim caldo", hex: "#42566B", why: "Il tuo blu, virato leggermente al caldo." },
        { name: "Cioccolato", hex: "#4A3626", why: "Sostituisce il nero e ammorbidisce i contrasti." },
        { name: "Panna", hex: "#F3EEE4", why: "Base chiara per abbinare tutto." },
      ]
    : [
        { name: "Bianco ottico", hex: "#F4F5F6", why: "Pulisce e alza la luce sugli incarnati freddi." },
        { name: "Grigio perla", hex: "#C9CBD0", why: "Neutro elegante, sostituisce il beige." },
        { name: "Blu inchiostro", hex: "#2B3A55", why: "Profondo e raffinato, ottimo di sera." },
        { name: "Bordeaux", hex: "#5E2733", why: "Il tuo rosso: intenso, mai squillante." },
        { name: "Verde bosco", hex: "#2F4A3C", why: "Freddo e ricco, valorizza gli occhi chiari." },
        { name: "Petrolio", hex: "#255560", why: "Accento fresco per maglieria e capispalla." },
        { name: "Antracite", hex: "#33363B", why: "L'alternativa morbida al nero pieno." },
        { name: "Lavanda fredda", hex: "#B9B7CC", why: "Tocco delicato per le mezze stagioni." },
      ];
  return base;
}

export function fallbackOutfits(mode = "smart", profile = {}) {
  const map = {
    elegante: [
      { title: "Monocromo profondo", items: ["Blazer strutturato", "Pantalone dritto", "Camicia in cotone pesante", "Derby in pelle"], colors: ["Blu inchiostro", "Panna"], searchTerms: ["blazer strutturato", "pantalone dritto elegante"] },
      { title: "Neutri caldi da sera", items: ["Maglia fine a collo alto", "Pantalone morbido", "Cappotto lungo", "Mocassino"], colors: ["Cammello", "Cioccolato"], searchTerms: ["cappotto lungo cammello", "mocassino pelle"] },
    ],
    casual: [
      { title: "Denim curato", items: ["Jeans dritti", "T-shirt pesante", "Camicia overshirt", "Sneaker minimal"], colors: ["Denim caldo", "Panna"], searchTerms: ["jeans dritti", "sneaker minimal bianca"] },
      { title: "Comfort ordinato", items: ["Felpa girocollo", "Chino", "Giacca leggera", "Sneaker"], colors: ["Grigio perla", "Verde oliva"], searchTerms: ["chino uomo", "felpa girocollo"] },
    ],
    smart: [
      { title: "Smart casual base", items: ["Blazer destrutturato", "T-shirt di qualità", "Jeans scuri", "Sneaker in pelle"], colors: ["Antracite", "Bianco ottico"], searchTerms: ["blazer destrutturato", "jeans scuri slim"] },
      { title: "Maglia + tailoring", items: ["Maglia fine", "Pantalone con pince", "Trench", "Loafer"], colors: ["Cammello", "Blu inchiostro"], searchTerms: ["trench beige", "pantalone pince"] },
    ],
    lavoro: [
      { title: "Ufficio essenziale", items: ["Camicia oxford", "Pantalone chino", "Maglia leggera", "Derby"], colors: ["Bianco ottico", "Petrolio"], searchTerms: ["camicia oxford", "chino elegante"] },
    ],
    sera: [
      { title: "Sera sobria", items: ["Camicia scura", "Pantalone dritto", "Cintura in pelle", "Stivaletto"], colors: ["Bordeaux", "Antracite"], searchTerms: ["camicia nera", "stivaletto pelle"] },
    ],
  };
  return map[mode] || map.smart;
}
