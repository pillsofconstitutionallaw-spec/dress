// Le dodici stagioni dell'armocromia, con la palette di ciascuna.
//
// Non è una tabella inventata: è la classificazione standard, che incrocia tre
// assi misurabili — sottotono (caldo/freddo), luminosità (chiaro/scuro) e
// intensità (brillante/spento). A ogni combinazione corrisponde una famiglia
// di colori che con quella pelle funziona.
//
// Averla qui, e non dentro un prompt, è il motivo per cui l'analisi funziona
// anche quando l'AI non risponde.

export const STAGIONI = {
  "Primavera chiara": {
    sottotono: "caldo", luce: "chiara", intensita: "media",
    descrizione: "Colori caldi e leggeri, come una mattina di aprile.",
    palette: [
      { name: "Panna calda", hex: "#F3E7CE", why: "Illumina senza sbiancare, meglio del bianco ottico." },
      { name: "Pesca", hex: "#F0BFA0", why: "Riprende il calore naturale dell'incarnato." },
      { name: "Verde mela", hex: "#A9C46C", why: "Fresco ma caldo: ravviva senza indurire." },
      { name: "Azzurro cielo", hex: "#93C4DE", why: "Il freddo che ti sta bene, perché resta chiaro." },
      { name: "Corallo", hex: "#E8836B", why: "Il tuo rosso: acceso ma con dentro il giallo." },
    ],
  },
  "Primavera calda": {
    sottotono: "caldo", luce: "media", intensita: "media",
    descrizione: "Il calore pieno: dorati, terre chiare, verdi solari.",
    palette: [
      { name: "Avorio dorato", hex: "#EFE0C0", why: "Neutro di base che non spegne il viso." },
      { name: "Oro antico", hex: "#C2A14D", why: "Riprende i riflessi caldi dei capelli." },
      { name: "Verde salvia caldo", hex: "#A2A96F", why: "Terroso e luminoso insieme." },
      { name: "Turchese caldo", hex: "#4FB3A5", why: "L'unico freddo che regge, perché vira al giallo." },
      { name: "Papavero", hex: "#D1503C", why: "Il rosso che ti accende invece di coprirti." },
    ],
  },
  "Primavera brillante": {
    sottotono: "caldo", luce: "media", intensita: "alta",
    descrizione: "Colori puri e pieni: il contrasto è alto e regge la saturazione.",
    palette: [
      { name: "Bianco caldo", hex: "#F8F1E3", why: "Base pulita che non ti spegne." },
      { name: "Turchese", hex: "#1FA9A0", why: "Puro e saturo: la tua intensità lo regge." },
      { name: "Giallo sole", hex: "#E8B833", why: "Acceso, come i riflessi che hai già addosso." },
      { name: "Rosso ciliegia", hex: "#C62B33", why: "Pieno e caldo, mai spento." },
      { name: "Blu vivido", hex: "#2B6CB8", why: "Il freddo brillante che tiene testa al resto." },
    ],
  },
  "Estate chiara": {
    sottotono: "freddo", luce: "chiara", intensita: "bassa",
    descrizione: "Colori freddi, chiari e polverosi: delicati come li sei tu.",
    palette: [
      { name: "Bianco freddo", hex: "#F4F5F6", why: "Pulisce e alza la luce sugli incarnati freddi." },
      { name: "Rosa cipria", hex: "#DFC0C4", why: "Delicato senza essere infantile." },
      { name: "Azzurro polvere", hex: "#A9C0D4", why: "Il colore che ti somiglia di più." },
      { name: "Lavanda", hex: "#BFB3D1", why: "Freddo e morbido, come il tuo contrasto." },
      { name: "Grigio perla", hex: "#C9CBD0", why: "Neutro elegante, sostituisce il beige." },
    ],
  },
  "Estate fredda": {
    sottotono: "freddo", luce: "media", intensita: "media",
    descrizione: "Freddi pieni ma mai duri: il blu è la tua lingua madre.",
    palette: [
      { name: "Bianco ottico", hex: "#F7F8F9", why: "Il tuo bianco: freddo, netto." },
      { name: "Blu polvere", hex: "#6E8CAE", why: "Profondo senza pesare." },
      { name: "Rosa antico", hex: "#C58D93", why: "Caldo apparente, ma con dentro il blu." },
      { name: "Verde eucalipto", hex: "#7E9E93", why: "Il verde che non vira al giallo." },
      { name: "Grigio ardesia", hex: "#6B7280", why: "Alternativa al nero, che su di te è troppo." },
    ],
  },
  "Estate spenta": {
    sottotono: "freddo", luce: "media", intensita: "bassa",
    descrizione: "Tutto un tono sotto: i colori polverosi ti riposano il viso.",
    palette: [
      { name: "Tortora", hex: "#B3A79A", why: "Neutro che non compete con te." },
      { name: "Malva", hex: "#A98FA0", why: "Il freddo ammorbidito che ti somiglia." },
      { name: "Blu jeans slavato", hex: "#7C93AB", why: "Come il denim consumato: mai acceso." },
      { name: "Verde salvia", hex: "#9AA88B", why: "Riposante, sta con crema e denim." },
      { name: "Prugna spenta", hex: "#6E5563", why: "Il tuo scuro, al posto del nero." },
    ],
  },
  "Autunno spento": {
    sottotono: "caldo", luce: "media", intensita: "bassa",
    descrizione: "Terre morbide: colori che sembrano già vissuti.",
    palette: [
      { name: "Burro", hex: "#EDE3C8", why: "L'alternativa morbida al bianco ottico." },
      { name: "Cammello", hex: "#B98F5E", why: "Il neutro caldo che ti fa da base." },
      { name: "Verde oliva", hex: "#6B6B33", why: "Terroso e spento: la tua zona." },
      { name: "Terracotta", hex: "#B5654A", why: "Caldo e polveroso, sostituisce il rosso." },
      { name: "Marrone cacao", hex: "#5A4632", why: "Il tuo scuro naturale, meglio del nero." },
    ],
  },
  "Autunno caldo": {
    sottotono: "caldo", luce: "media", intensita: "media",
    descrizione: "Il calore pieno dell'autunno: ruggine, ottone, bosco.",
    palette: [
      { name: "Panna", hex: "#F2E8D5", why: "Base calda che ti illumina." },
      { name: "Ruggine", hex: "#A85231", why: "Il colore che sembra fatto per te." },
      { name: "Senape", hex: "#B8912F", why: "Riprende l'oro che hai negli occhi e nei capelli." },
      { name: "Verde bosco", hex: "#3E5B3C", why: "Profondo ma caldo: non ti spegne." },
      { name: "Cuoio", hex: "#8A5A32", why: "Neutro scuro, elegante e senza durezza." },
    ],
  },
  "Autunno scuro": {
    sottotono: "caldo", luce: "scura", intensita: "media",
    descrizione: "Caldi profondi: il buio con dentro il rosso e l'oro.",
    palette: [
      { name: "Avorio", hex: "#F1E9DA", why: "Il chiaro che regge il tuo contrasto." },
      { name: "Bordeaux", hex: "#5C1F26", why: "Profondo e caldo: il tuo rosso serale." },
      { name: "Verde bottiglia", hex: "#22402C", why: "Scuro senza essere nero." },
      { name: "Testa di moro", hex: "#3E2B22", why: "Il tuo nero, che nero non è." },
      { name: "Oro bruciato", hex: "#9A7628", why: "L'accento che ti accende il viso." },
    ],
  },
  "Inverno freddo": {
    sottotono: "freddo", luce: "media", intensita: "alta",
    descrizione: "Freddi netti e saturi: il contrasto è il tuo alleato.",
    palette: [
      { name: "Bianco ottico", hex: "#FFFFFF", why: "Nessun altro bianco ti rende giustizia." },
      { name: "Blu reale", hex: "#1B4FA0", why: "Saturo e freddo: ti sta come una firma." },
      { name: "Rosso lampone", hex: "#B01F45", why: "Il rosso col blu dentro." },
      { name: "Verde smeraldo", hex: "#0F7A5A", why: "Freddo e brillante insieme." },
      { name: "Grigio antracite", hex: "#3A3D40", why: "Il neutro scuro che regge il tuo contrasto." },
    ],
  },
  "Inverno scuro": {
    sottotono: "freddo", luce: "scura", intensita: "alta",
    descrizione: "I contrasti forti e i colori profondi sono casa tua.",
    palette: [
      { name: "Bianco ghiaccio", hex: "#F7F9FB", why: "Il massimo contrasto, che tu reggi." },
      { name: "Nero", hex: "#111213", why: "Uno dei pochi tipi a cui sta davvero bene." },
      { name: "Blu notte", hex: "#1B2A41", why: "Profondo, elegante, mai spento." },
      { name: "Vinaccia", hex: "#6B2233", why: "Lo scuro con dentro il freddo." },
      { name: "Verde pino", hex: "#12403A", why: "Il verde che non vira al giallo." },
    ],
  },
  "Inverno brillante": {
    sottotono: "freddo", luce: "media", intensita: "molto alta",
    descrizione: "Colori puri, senza mezze misure: pastelli e spenti ti spengono.",
    palette: [
      { name: "Bianco puro", hex: "#FFFFFF", why: "Base netta, senza sfumature calde." },
      { name: "Fucsia", hex: "#C2286E", why: "Saturo e freddo: la tua intensità lo chiede." },
      { name: "Turchese elettrico", hex: "#0E9AAE", why: "Brillante come il tuo contrasto." },
      { name: "Blu cobalto", hex: "#1B4FA0", why: "Pieno, mai polveroso." },
      { name: "Nero", hex: "#111213", why: "Il tuo neutro, quello vero." },
    ],
  },
};

/**
 * Dalla misura alla stagione.
 *
 * Tre assi, come vuole la teoria: sottotono, luminosità, intensità del
 * contrasto. Le soglie sono tarate sull'occhio, non sulla matematica pura:
 * la pelle umana occupa una zona ristretta dello spazio Lab, e le differenze
 * che contano sono piccole.
 *
 * @param sottotono  b* della pelle: sopra ~18 tira al giallo (caldo)
 * @param luce       L* della pelle
 * @param contrasto  differenza di luminosità fra capelli e pelle
 */
export function stagioneDa({ sottotono, luce, contrasto }) {
  const caldo = sottotono >= 17.5;
  const chiara = luce >= 68;
  const scura = luce <= 52;
  const forte = contrasto >= 42;
  const debole = contrasto <= 22;

  if (caldo) {
    if (chiara && !forte) return "Primavera chiara";
    if (forte) return "Primavera brillante";
    if (scura) return "Autunno scuro";
    if (debole) return "Autunno spento";
    return luce >= 60 ? "Primavera calda" : "Autunno caldo";
  }

  if (chiara && !forte) return "Estate chiara";
  if (debole) return "Estate spenta";
  if (forte && scura) return "Inverno scuro";
  if (contrasto >= 52) return "Inverno brillante";
  if (forte) return "Inverno freddo";
  return "Estate fredda";
}

/**
 * La palette non cambia col meteo — è il senso stesso dell'armocromia: i tuoi
 * colori sono i tuoi tutto l'anno. Quello che cambia è QUALI di quei colori
 * portare di più, e su che tessuti.
 *
 * D'estate salgono i chiari della tua palette, d'inverno i profondi. Non sono
 * colori nuovi: sono gli stessi, ordinati diversamente.
 */
export function paletteDelPeriodo(palette = [], periodo = "primavera") {
  const luce = (hex) => {
    const h = String(hex || "").replace("#", "");
    if (h.length !== 6) return 50;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 2.55;
  };

  const ordinata = [...palette].sort((a, b) => luce(b.hex) - luce(a.hex));

  if (periodo === "estate") return { ordine: ordinata, nota: "D'estate porta avanti i più chiari della tua palette: con la luce forte reggono meglio." };
  if (periodo === "inverno") return { ordine: [...ordinata].reverse(), nota: "D'inverno vengono avanti i tuoi colori profondi: con poca luce i chiari si spengono." };
  if (periodo === "autunno") return { ordine: [...ordinata].reverse(), nota: "In autunno i toni pieni della tua palette, sui tessuti più corposi." };
  return { ordine: ordinata, nota: "In primavera i tuoi colori più leggeri, su cotone e lino." };
}
