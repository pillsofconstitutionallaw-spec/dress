import { ruoloDelCapo } from "@/lib/periodiAnno";

// Le taglie che uno porta di solito.
//
// Al posto del peso. Il peso si chiedeva «per proporti la taglia giusta», e
// non serviva a niente: nessuna parte dell'app lo usava, e per passare dai
// chili alla taglia servirebbero le tabelle di ogni marca, che non abbiamo.
// La taglia invece la sa chiunque a memoria, non mette a disagio nessuno, e
// si confronta direttamente con quelle che i negozi scrivono sui capi.
//
// Lettere sopra e sotto, numeri per le scarpe: sono le scale che nel catalogo
// compaiono più spesso, e le uniche su cui si può dire con sicurezza «questo
// capo nella tua taglia non c'è».

export const TAGLIE_LETTERE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
export const TAGLIE_SCARPE = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];

export const DOMANDE_TAGLIA = [
  { id: "tagliaSopra", nome: "Sopra", detta: "magliette, camicie, maglioni, giacche", scala: TAGLIE_LETTERE },
  { id: "tagliaSotto", nome: "Sotto", detta: "pantaloni, gonne, jeans", scala: TAGLIE_LETTERE },
  { id: "tagliaScarpe", nome: "Scarpe", detta: "numero europeo", scala: TAGLIE_SCARPE },
];

/** Le taglie di un profilo in una riga: «Sopra M · Sotto S · Scarpe 39». */
export function taglieInBreve(profilo = {}) {
  return DOMANDE_TAGLIA.filter((d) => profilo[d.id])
    .map((d) => `${d.nome} ${profilo[d.id]}`)
    .join(" · ");
}

/**
 * Il profilo senza i dati che non teniamo più.
 *
 * Il peso c'era nei profili salvati prima che smettessimo di chiederlo. Non
 * lo usiamo, e un dato che non si usa non si conserva: si toglie quando il
 * profilo si rilegge, e al primo salvataggio sparisce anche dall'account.
 */
export function senzaDatiInutili(profilo) {
  if (!profilo || typeof profilo !== "object") return profilo;
  const { weight, ...resto } = profilo;
  return resto;
}

// ── Il capo esiste nella tua taglia? ────────────────────────────────────
//
// I negozi le scrivono come vogliono: «M», «Adult | M», «2XL» per XXL, «42»
// che può essere italiano o americano, «30» che è il girovita di un jeans,
// «UNICA». Da qui la regola, che è una sola: un capo si nasconde solo
// quando siamo SICURI che la tua taglia non c'è. Cioè quando il capo usa la
// stessa scala della tua — lettere per i vestiti, numeri europei per le
// scarpe — e la tua manca. In ogni altro caso resta: un capo in più da
// guardare costa poco, uno buono nascosto per sbaglio non si ritrova più.
//
// E vale per le taglie che il capo ha, non per quelle rimaste: il catalogo
// sa quali taglie esistono, non quante ne restano in magazzino.

const LETTERE = new Set([...TAGLIE_LETTERE, "4XL"]);
const SINONIMI = { "2XS": "XXS", "2XL": "XXL", XXXL: "3XL", XXXXL: "4XL" };

function comeLettera(t) {
  const v = String(t || "").toUpperCase().split("|").pop().trim();
  const s = SINONIMI[v] || v;
  return LETTERE.has(s) ? s : null;
}

function comeNumeroScarpa(t) {
  const m = String(t || "").trim().replace(",", ".").match(/^(?:EU\s*)?(\d{2})(?:\.5|\s*1\/2)?$/i);
  const n = m ? Number(m[1]) : NaN;
  return n >= 33 && n <= 50 ? n : null;
}

// Quale delle tue tre taglie conta per questo capo.
const PER_RUOLO = { capospalla: "tagliaSopra", top: "tagliaSopra", intero: "tagliaSopra", bottom: "tagliaSotto", scarpe: "tagliaScarpe" };

/**
 * @param capo    una riga del catalogo: titolo, categoria, taglie
 * @param profilo le taglie di chi guarda: tagliaSopra, tagliaSotto, tagliaScarpe
 * @returns false solo se il capo sicuramente non esiste nella tua taglia
 */
export function esisteNellaTuaTaglia(capo, profilo) {
  const campo = PER_RUOLO[ruoloDelCapo(capo?.titolo || "", capo?.categoria || "")];
  const mia = campo ? profilo?.[campo] : null;
  const sue = Array.isArray(capo?.taglie) ? capo.taglie : [];
  if (!mia || !sue.length) return true;

  // «Stessa scala» vuol dire quasi tutte le sue taglie in quella scala: un
  // capo con «S, M, L, 42» è un capo a lettere con una voce strana, uno con
  // «42, 44, M» non si sa cos'è, e allora non si giudica.
  const leggi = campo === "tagliaScarpe" ? comeNumeroScarpa : comeLettera;
  const lette = sue.map(leggi).filter((x) => x !== null);
  if (lette.length < sue.length * 0.6) return true;

  return campo === "tagliaScarpe" ? lette.includes(Number(mia)) : lette.includes(mia);
}

/** Le taglie di chi guarda, prese da quello che manda la pagina. Niente di più. */
export function taglieDa(x) {
  const t = {};
  for (const d of DOMANDE_TAGLIA) {
    const v = String(x?.[d.id] || "").trim().toUpperCase();
    if (d.scala.includes(v)) t[d.id] = v;
  }
  return t;
}
