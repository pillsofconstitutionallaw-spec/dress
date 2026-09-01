import { differenza, hexALab } from "@/lib/colore";
import { regoleDa } from "@/lib/sinonimi";

// I pezzi condivisi fra chi cerca capi per palette.
//
// Stavano tutti dentro app/api/capi/route.js, e la pagina degli stili aveva
// bisogno degli stessi: prima di copiarli si spostano qui.

// Dalla palette (nomi e hex) alle coordinate percettive.
export function coloriVoluti(palette) {
  return (palette || [])
    // `principale` viene con noi: serve a sapere su quali colori ripiegare
    // quando la ricerca completa non entra nel tempo concesso.
    .map((c) => ({ nome: c.name || c.nome || "", lab: hexALab(c.hex), principale: Boolean(c.principale) }))
    .filter((c) => c.lab);
}

// A ogni capo si attacca QUALE colore della palette ha centrato, e di quanto
// ha sbagliato. È l'informazione che rende il consiglio comprensibile.
export function arricchisci(righe, voluti) {
  return (righe || []).map((capo) => {
    const suo = { L: capo.colore_l, a: capo.colore_a, b: capo.colore_b };
    let vicino = null;
    let scarto = Infinity;
    for (const v of voluti) {
      const d = differenza(suo, v.lab);
      if (d < scarto) {
        scarto = d;
        vicino = v.nome;
      }
    }
    return { ...capo, colore_palette: vicino, scarto: Number(scarto.toFixed(1)) };
  });
}

// Alcuni negozi pubblicano lo stesso capo una volta per variante: senza
// questo l'utente vede sei volte lo stesso portafortuna bordeaux.
export function senzaDoppioni(capi) {
  const visti = new Set();
  return capi.filter((c) => {
    const chiave = `${c.negozio}|${String(c.titolo).toLowerCase().trim()}`;
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}

/**
 * Alterna i capi fra i colori della palette.
 *
 * Senza questo la classifica la vincono i capi che il negozio chiama già col
 * nome esatto del colore — scarto zero — e l'utente vede sei magliette verdi
 * invece dei suoi cinque colori. Qui si pesca a turno dal gruppo di ogni
 * colore, tenendo l'ordine di merito dentro ciascuno.
 */
export function distribuisci(capi, voluti) {
  const gruppi = new Map(voluti.map((v) => [v.nome, []]));
  for (const capo of capi) {
    if (!gruppi.has(capo.colore_palette)) gruppi.set(capo.colore_palette, []);
    gruppi.get(capo.colore_palette).push(capo);
  }

  const code = [...gruppi.values()].filter((g) => g.length);
  const fuori = [];
  let i = 0;
  while (fuori.length < capi.length) {
    const coda = code[i % code.length];
    if (coda.length) fuori.push(coda.shift());
    else if (code.every((c) => !c.length)) break;
    i++;
  }
  return fuori;
}

// ── Per chi è questo capo ────────────────────────────────────────────
//
// Chi imposta "uomo" si ritrovava reggiseni, pigiami da donna e scarpe da
// neonato. Tre cause diverse, e nessuna era il filtro del genere in sé:
//
// 1. un terzo del catalogo — 22.966 capi su 68.897 — non ha il genere
//    scritto, perché molti negozi non lo pubblicano, e la ricerca li faceva
//    passare tutti senza penalità, ordinati solo per colore;
// 2. certi negozi dichiarano un genere loro che il singolo capo smentisce:
//    Muchachomalo è segnato "uomo" e vende anche capi intitolati "Dames",
//    che in olandese vuol dire donna;
// 3. le scarpe da bambino non hanno un genere adulto e non ce l'avranno mai,
//    e nessuno le stava escludendo.
//
// Buttare via i capi senza genere toglierebbe un terzo del catalogo. Quindi
// restano, ma in fondo: prima quelli giusti, poi gli unisex, poi i dubbi.

// Le parole con cui un capo dichiara per chi è, nelle lingue dei negozi che
// abbiamo in catalogo. L'olandese non è un vezzo: è il negozio del reggiseno.
const PAROLE_DONNA = /\b(donna|donne|femminile|women|womens|women's|woman|womans|lady|ladies|dames|femme|femmes|mujer|damen)\b/i;
const PAROLE_UOMO = /\b(uomo|uomini|maschile|men|mens|men's|man|mans|heren|homme|hommes|hombre|herren)\b/i;

// I capi per bambini non sono "di un altro genere": sono di un'altra persona.
// Una sneaker da neonato in mezzo ai consigli non è un consiglio impreciso, è
// un errore, e non c'è nessuno a cui vada bene vederla.
// "baby" da solo era troppo goloso: prendeva "Baby Blue" e "Baby Pink", che
// sono colori, e "Baby Tee", che è una maglietta da adulta. Se ne accorge
// solo chi guarda i titoli veri prima di scrivere — l'elenco dei capi
// esclusi, non la regola.
const PAROLE_BAMBINO = /\b(bambin[oaie]|bimb[oaie]|kids?|infant|toddler|junior|jr|girls?|boys?|neonat[oi]|newborn|child|children)\b|\bbab(y|ies)\b(?!\s*(blue|blu|pink|rosa|tee|doll|girl))/i;

// Certi capi dicono per chi sono col nome, in qualunque lingua e senza
// bisogno che il negozio lo scriva: una gonna è una gonna. Fra i 22.400 capi
// senza genere in catalogo ce ne sono circa millecento così — gonne,
// vestiti, reggiseni, bluse — che a un uomo non vanno proposti nemmeno in
// fondo all'elenco.
//
// L'elenco è corto apposta. "Vestito" in italiano è anche l'abito da uomo,
// "dress shirt" è una camicia da uomo, "tie-dye" non è una cravatta: dove il
// nome è ambiguo si lascia perdere, perché escludere per sbaglio è peggio
// che non escludere.
const CAPI_DA_DONNA = /\b(gonn[ae]|skirts?|reggisen[oi]|bralette|bikini|gu[eê]pi[eè]re|camicett[ae]|blus[ae]|blouses?|d[eé]collet[eé]|tacchi)\b|\bdress(?!ing|\s*shirt)(es)?\b/i;
const CAPI_DA_UOMO = /\b(cravatt[ae]|papillon|neckties?|tuxedos?)\b/i;

/** Per chi è, letto da quello che il capo dichiara di sé. */
export function perChiE(capo) {
  const testo = `${capo?.titolo || ""} ${capo?.categoria || ""}`;
  if (PAROLE_BAMBINO.test(testo)) return "bambino";
  const donna = PAROLE_DONNA.test(testo) || CAPI_DA_DONNA.test(testo);
  const uomo = PAROLE_UOMO.test(testo) || CAPI_DA_UOMO.test(testo);
  // Quello che dice il capo vale più di quello che dichiara il negozio: il
  // negozio parla di sé in generale, il titolo parla di questo capo.
  if (donna && !uomo) return "donna";
  if (uomo && !donna) return "uomo";
  if (donna && uomo) return "unisex";
  return capo?.genere || null;
}

/**
 * Quanto è pertinente per chi sta guardando. Più basso, più vicino.
 * Il genere sbagliato e i capi da bambino non hanno un numero: si tolgono.
 */
export function pertinenza(capo, genere) {
  const suo = perChiE(capo);
  if (suo === "bambino") return null;
  if (!genere) return 0;
  if (suo === genere) return 0;
  if (suo === "unisex") return 1;
  // Chi non dice per chi è resta, ma per ultimo.
  //
  // Per un attimo li avevo buttati tutti, e sarebbe stato sbagliato: quei
  // 22.400 capi sono in gran parte sneaker, zaini e berretti, che da donna
  // non sono — sono di nessuno. Buttarli non è "non mostrarmi roba da
  // donna", è mostrarmi metà catalogo.
  //
  // Quelli che invece da donna lo sono davvero adesso escono lo stesso,
  // riconosciuti dal nome del capo: una gonna è una gonna anche quando il
  // negozio non scrive per chi è.
  if (!suo) return 2;
  return null; // il genere opposto
}

/**
 * Toglie quello che non c'entra e mette avanti quello che c'entra di più.
 *
 * L'ordine dentro ogni fascia resta quello che aveva: i capi arrivano già
 * ordinati per quanto il colore corrisponde, e non è questa funzione a dover
 * decidere di colori.
 */
export function perChiCerca(capi, genere = null) {
  return (capi || [])
    .map((capo, posizione) => ({ capo, posizione, grado: pertinenza(capo, genere) }))
    .filter((x) => x.grado !== null)
    .sort((a, b) => a.grado - b.grado || a.posizione - b.posizione)
    .map((x) => x.capo);
}

/**
 * Solo i capi che c'entrano con quello che è stato scritto nella casella,
 * e prima quelli che c'entrano di più.
 *
 * Basta che una parola si ritrovi: chi scrive "giubbino North Face" cerca un
 * giubbino, e pretendere tutte e tre le parole vorrebbe dire non trovare mai
 * niente. Ma dove si ritrova cambia tutto, e il caso che lo ha insegnato è
 * una maglia in lana merino comparsa fra i "jeans baggy": si chiama "Selvino
 * — Maglia Uomo Mezza Zip", ed è di colore JEANS. Cercare nel nome del
 * colore alla pari del titolo vuol dire scambiare com'è fatto un capo per
 * che capo è.
 *
 * Quindi il titolo pesa, la categoria un po' meno, la marca poco, e il
 * colore quasi niente — ma resta, perché chi scrive "camicia bianca" il
 * bianco lo trova lì.
 *
 * E ogni parola porta con sé la sua famiglia: "stivali" trova anche i boots,
 * che in catalogo sono quattordici volte tanti.
 */
const DOVE_CERCARE = [
  { campo: "titolo", peso: 4 },
  { campo: "categoria", peso: 2 },
  { campo: "marca", peso: 1 },
  // La descrizione pesa pochissimo, ed è giusto così: è lunga, parla di
  // tutto, e i negozi ci scrivono dentro anche con cosa abbinare il capo —
  // "sta bene su un jeans" compare sulla scheda di una camicia. Serve a far
  // emergere quello che nessun altro campo trova, non a decidere l'ordine.
  { campo: "descrizione", peso: 0.25 },
  { campo: "colore_nome", peso: 0.25 },
];

export function comeLoHaiChiamato(capi, testo) {
  const gruppi = regoleDa(testo);
  if (!gruppi.length) return capi || [];

  return (capi || [])
    .map((capo, posizione) => {
      let punti = 0;
      for (const { campo, peso } of DOVE_CERCARE) {
        const dove = String(capo?.[campo] || "");
        gruppi.forEach((gruppo, i) => {
          // La prima parola pesa di più perché quasi sempre è il capo, e le
          // altre lo descrivono: in "jeans baggy" il jeans è la cosa, baggy
          // è com'è fatta. Contandole uguali, una felpa oversize saliva al
          // quarto posto fra i jeans — di "baggy" aveva il sinonimo, di
          // jeans niente, e pareggiava con dei jeans veri.
          if (gruppo.some((regola) => regola.test(dove))) punti += peso * (i === 0 ? 1.5 : 1);
        });
      }
      return { capo, posizione, punti };
    })
    .filter((x) => x.punti > 0)
    // A parità di pertinenza resta l'ordine di prima, che è quello del colore.
    .sort((a, b) => b.punti - a.punti || a.posizione - b.posizione)
    .map((x) => x.capo);
}
