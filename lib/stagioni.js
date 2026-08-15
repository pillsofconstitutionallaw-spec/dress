// Le dodici stagioni dell'armocromia, con la palette di ciascuna.
//
// Non è una tabella inventata: è la classificazione standard, che incrocia tre
// assi misurabili — sottotono (caldo/freddo), profondità (chiaro/scuro) e
// contrasto. A ogni combinazione corrisponde una famiglia di colori che con
// quella pelle funziona.
//
// Averla qui, e non dentro un prompt, è il motivo per cui l'analisi funziona
// anche quando l'AI non risponde.
//
// Ogni palette ha dodici colori. I primi cinque sono i PRINCIPALI: quelli che
// si mostrano con la spiegazione, quelli da cui partire per comprare. Gli
// altri sette completano la stagione e servono soprattutto a cercare i capi:
// con cinque colori soli il catalogo restituiva sempre le stesse cose, e
// mancavano interi settori — sei stagioni su dodici non avevano un azzurro,
// e chi si sa già "da celeste" non si riconosceva nella propria palette.

export const STAGIONI = {
  "Primavera chiara": {
    sottotono: "caldo", luce: "chiara", intensita: "media",
    descrizione: "Colori caldi e leggeri, come una mattina di aprile.",
    palette: [
      { name: "Panna calda", hex: "#F3E7CE", principale: true, why: "Illumina senza sbiancare, meglio del bianco ottico." },
      { name: "Pesca", hex: "#F0BFA0", principale: true, why: "Riprende il calore naturale dell'incarnato." },
      { name: "Verde mela", hex: "#A9C46C", principale: true, why: "Fresco ma caldo: ravviva senza indurire." },
      { name: "Azzurro cielo", hex: "#93C4DE", principale: true, why: "Il freddo che ti sta bene, perché resta chiaro." },
      { name: "Corallo", hex: "#E8836B", principale: true, why: "Il tuo rosso: acceso ma con dentro il giallo." },
      { name: "Giallo narciso", hex: "#F2D06B", why: "Il giallo chiaro, quello dei primi fiori." },
      { name: "Turchese chiaro", hex: "#7FCFC4", why: "Fresco senza essere gelido." },
      { name: "Blu fiordaliso", hex: "#6F9FD8", why: "Il blu che reggi, perché resta luminoso." },
      { name: "Rosa caldo", hex: "#F0A7A0", why: "Rosa con dentro l'arancio, mai il lilla." },
      { name: "Lilla caldo", hex: "#C9B3D9", why: "L'unico viola chiaro che non ti spegne." },
      { name: "Cammello chiaro", hex: "#D8B98C", why: "Il neutro caldo al posto del grigio." },
      { name: "Cacao chiaro", hex: "#9A7B5F", why: "Il tuo scuro: caldo, mai nero." },
    ],
  },
  "Primavera calda": {
    sottotono: "caldo", luce: "media", intensita: "media",
    descrizione: "Il calore pieno: dorati, terre chiare, verdi solari.",
    palette: [
      { name: "Avorio dorato", hex: "#EFE0C0", principale: true, why: "Neutro di base che non spegne il viso." },
      { name: "Oro antico", hex: "#C2A14D", principale: true, why: "Riprende i riflessi caldi dei capelli." },
      { name: "Verde salvia caldo", hex: "#A2A96F", principale: true, why: "Terroso e luminoso insieme." },
      { name: "Turchese caldo", hex: "#4FB3A5", principale: true, why: "L'unico freddo che regge, perché vira al giallo." },
      { name: "Papavero", hex: "#D1503C", principale: true, why: "Il rosso che ti accende invece di coprirti." },
      { name: "Corallo caldo", hex: "#E8724F", why: "L'arancio portabile, quello che sta sul viso." },
      { name: "Verde prato", hex: "#6FA845", why: "Il verde con dentro il giallo, mai il blu." },
      { name: "Blu pervinca", hex: "#6C8FD0", why: "Il tuo blu: chiaro e mai cupo." },
      { name: "Pesca intensa", hex: "#EFA878", why: "Il rosa che ti somiglia, perché è caldo." },
      { name: "Giallo mais", hex: "#E7C24E", why: "Pieno e solare, ti alza la luce." },
      { name: "Cuoio", hex: "#8A5F35", why: "Il marrone che sostituisce il grigio scuro." },
      { name: "Mattone caldo", hex: "#8E3B2E", why: "Il tuo scuro serale, senza durezza." },
    ],
  },
  "Primavera brillante": {
    sottotono: "caldo", luce: "media", intensita: "alta",
    descrizione: "Colori puri e pieni: il contrasto è alto e regge la saturazione.",
    palette: [
      { name: "Bianco caldo", hex: "#F8F1E3", principale: true, why: "Base pulita che non ti spegne." },
      { name: "Turchese", hex: "#1FA9A0", principale: true, why: "Puro e saturo: la tua intensità lo regge." },
      { name: "Giallo sole", hex: "#E8B833", principale: true, why: "Acceso, come i riflessi che hai già addosso." },
      { name: "Rosso ciliegia", hex: "#C62B33", principale: true, why: "Pieno e caldo, mai spento." },
      { name: "Blu vivido", hex: "#2B6CB8", principale: true, why: "Il freddo brillante che tiene testa al resto." },
      { name: "Azzurro brillante", hex: "#4FB4E8", why: "Il celeste pieno: sul tuo contrasto funziona." },
      { name: "Smeraldo caldo", hex: "#14946B", why: "Verde saturo con dentro il giallo." },
      { name: "Fucsia caldo", hex: "#D63B7A", why: "Il rosa acceso, quello che si vede." },
      { name: "Corallo acceso", hex: "#F4693F", why: "L'arancio che ti sta come niente altro." },
      { name: "Violetta", hex: "#7B4FB5", why: "Il viola che regge la tua saturazione." },
      { name: "Beige dorato", hex: "#E2CBA0", why: "Il neutro chiaro, quando serve calma." },
      { name: "Blu navy vivo", hex: "#1E3A73", why: "Il tuo scuro: profondo ma mai nero." },
    ],
  },
  "Estate chiara": {
    sottotono: "freddo", luce: "chiara", intensita: "bassa",
    descrizione: "Colori freddi, chiari e polverosi: delicati come li sei tu.",
    palette: [
      { name: "Bianco freddo", hex: "#F4F5F6", principale: true, why: "Pulisce e alza la luce sugli incarnati freddi." },
      { name: "Rosa cipria", hex: "#DFC0C4", principale: true, why: "Delicato senza essere infantile." },
      { name: "Azzurro polvere", hex: "#A9C0D4", principale: true, why: "Il colore che ti somiglia di più." },
      { name: "Lavanda", hex: "#BFB3D1", principale: true, why: "Freddo e morbido, come il tuo contrasto." },
      { name: "Grigio perla", hex: "#C9CBD0", principale: true, why: "Neutro elegante, sostituisce il beige." },
      { name: "Celeste", hex: "#9EC9E2", why: "Il celeste vero, quello che si nota appena." },
      { name: "Blu polvere chiaro", hex: "#7E9CC4", why: "Il blu portabile di giorno." },
      { name: "Verde acqua freddo", hex: "#A8CFC6", why: "Verde senza giallo dentro." },
      { name: "Rosa antico chiaro", hex: "#D9A6B0", why: "Il rosa più deciso che reggi." },
      { name: "Malva chiara", hex: "#C3A9BD", why: "Fra il rosa e il viola: la tua zona." },
      { name: "Grigio blu", hex: "#8E9BAA", why: "Il neutro medio, al posto del marrone." },
      { name: "Blu navy morbido", hex: "#46587C", why: "Il tuo scuro, che il nero fa troppo." },
    ],
  },
  "Estate fredda": {
    sottotono: "freddo", luce: "media", intensita: "media",
    descrizione: "Freddi pieni ma mai duri: il blu è la tua lingua madre.",
    palette: [
      { name: "Bianco ottico", hex: "#F7F8F9", principale: true, why: "Il tuo bianco: freddo, netto." },
      { name: "Blu polvere", hex: "#6E8CAE", principale: true, why: "Profondo senza pesare." },
      { name: "Rosa antico", hex: "#C58D93", principale: true, why: "Caldo apparente, ma con dentro il blu." },
      { name: "Verde eucalipto", hex: "#7E9E93", principale: true, why: "Il verde che non vira al giallo." },
      { name: "Grigio ardesia", hex: "#6B7280", principale: true, why: "Alternativa al nero, che su di te è troppo." },
      { name: "Celeste freddo", hex: "#8FB8D8", why: "Il chiaro della tua famiglia: sempre giusto." },
      { name: "Blu navy", hex: "#34496E", why: "Il tuo scuro di riferimento, meglio del nero." },
      { name: "Lampone spento", hex: "#A64C63", why: "Il rosso con dentro il blu." },
      { name: "Lavanda intensa", hex: "#8C82AE", why: "Il viola che ti riesce naturale." },
      { name: "Verde acqua", hex: "#6FA79C", why: "Freddo e riposante, sta con tutto il resto." },
      { name: "Tortora freddo", hex: "#A9A9AE", why: "Neutro medio che non litiga con niente." },
      { name: "Prugna", hex: "#5E3F55", why: "Lo scuro con dentro il freddo." },
    ],
  },
  "Estate spenta": {
    sottotono: "freddo", luce: "media", intensita: "bassa",
    descrizione: "Tutto un tono sotto: i colori polverosi ti riposano il viso.",
    palette: [
      { name: "Tortora", hex: "#B3A79A", principale: true, why: "Neutro che non compete con te." },
      { name: "Malva", hex: "#A98FA0", principale: true, why: "Il freddo ammorbidito che ti somiglia." },
      { name: "Blu jeans slavato", hex: "#7C93AB", principale: true, why: "Come il denim consumato: mai acceso." },
      { name: "Verde salvia", hex: "#9AA88B", principale: true, why: "Riposante, sta con crema e denim." },
      { name: "Prugna spenta", hex: "#6E5563", principale: true, why: "Il tuo scuro, al posto del nero." },
      { name: "Celeste polveroso", hex: "#A2BCCB", why: "Il celeste smorzato: acceso ti salterebbe addosso." },
      { name: "Ottanio spento", hex: "#4E6E78", why: "Fra il blu e il verde, come piace a te." },
      { name: "Rosa cipria spento", hex: "#C6A6A6", why: "Il rosa che non fa bambola." },
      { name: "Perla calda", hex: "#BFBBB4", why: "Il chiaro di base, meglio del bianco puro." },
      { name: "Bosco spento", hex: "#5F7060", why: "Verde scuro senza lucentezza." },
      { name: "Vinaccia spenta", hex: "#7A4E56", why: "Il rosso profondo, ma polveroso." },
      { name: "Blu notte morbido", hex: "#3E4A63", why: "Lo scuro serale, che il nero ti indurisce." },
    ],
  },
  "Autunno spento": {
    sottotono: "caldo", luce: "media", intensita: "bassa",
    descrizione: "Terre morbide: colori che sembrano già vissuti.",
    palette: [
      { name: "Burro", hex: "#EDE3C8", principale: true, why: "L'alternativa morbida al bianco ottico." },
      { name: "Cammello", hex: "#B98F5E", principale: true, why: "Il neutro caldo che ti fa da base." },
      { name: "Verde oliva", hex: "#6B6B33", principale: true, why: "Terroso e spento: la tua zona." },
      { name: "Terracotta", hex: "#B5654A", principale: true, why: "Caldo e polveroso, sostituisce il rosso." },
      { name: "Marrone cacao", hex: "#5A4632", principale: true, why: "Il tuo scuro naturale, meglio del nero." },
      { name: "Ottanio", hex: "#3F6B72", why: "Il tuo blu: ha dentro il verde, non il blu puro." },
      { name: "Azzurro polveroso", hex: "#8FAFB5", why: "Il celeste che reggi, perché è sporcato." },
      { name: "Salvia calda", hex: "#93A183", why: "Il verde chiaro di tutti i giorni." },
      { name: "Rosa mattone", hex: "#C08878", why: "Il rosa con dentro la terra." },
      { name: "Senape spenta", hex: "#B99A4E", why: "L'oro smorzato, il tuo giallo." },
      { name: "Bordeaux spento", hex: "#7A4A45", why: "Il rosso profondo senza lucentezza." },
      { name: "Grigio tortora", hex: "#A79C8E", why: "Il neutro medio, mai freddo." },
    ],
  },
  "Autunno caldo": {
    sottotono: "caldo", luce: "media", intensita: "media",
    descrizione: "Il calore pieno dell'autunno: ruggine, ottone, bosco.",
    palette: [
      { name: "Panna", hex: "#F2E8D5", principale: true, why: "Base calda che ti illumina." },
      { name: "Ruggine", hex: "#A85231", principale: true, why: "Il colore che sembra fatto per te." },
      { name: "Senape", hex: "#B8912F", principale: true, why: "Riprende l'oro che hai negli occhi e nei capelli." },
      { name: "Verde bosco", hex: "#3E5B3C", principale: true, why: "Profondo ma caldo: non ti spegne." },
      { name: "Cuoio", hex: "#8A5A32", principale: true, why: "Neutro scuro, elegante e senza durezza." },
      { name: "Blu ottanio profondo", hex: "#2F6068", why: "Il tuo blu: tirato al verde, mai gelido." },
      { name: "Turchese caldo scuro", hex: "#3E8C82", why: "Il freddo che ti riesce, perché ha il giallo dentro." },
      { name: "Zucca", hex: "#C86A2B", why: "L'arancio pieno, il tuo colore d'accento." },
      { name: "Oliva scuro", hex: "#5C6032", why: "Il verde da giacca e pantalone." },
      { name: "Mattone", hex: "#9E4230", why: "Il rosso con la terra dentro." },
      { name: "Sabbia", hex: "#D9BE93", why: "Il chiaro di base, al posto del bianco." },
      { name: "Castagna", hex: "#6B4327", why: "Il marrone profondo che ti fa da nero." },
    ],
  },
  "Autunno scuro": {
    sottotono: "caldo", luce: "scura", intensita: "media",
    descrizione: "Caldi profondi: il buio con dentro il rosso e l'oro.",
    palette: [
      { name: "Avorio", hex: "#F1E9DA", principale: true, why: "Il chiaro che regge il tuo contrasto." },
      { name: "Bordeaux", hex: "#5C1F26", principale: true, why: "Profondo e caldo: il tuo rosso serale." },
      { name: "Verde bottiglia", hex: "#22402C", principale: true, why: "Scuro senza essere nero." },
      { name: "Testa di moro", hex: "#3E2B22", principale: true, why: "Il tuo nero, che nero non è." },
      { name: "Oro bruciato", hex: "#9A7628", principale: true, why: "L'accento che ti accende il viso." },
      { name: "Blu petrolio", hex: "#1F4249", why: "Il blu che regge la tua profondità: ha il verde dentro." },
      { name: "Turchese profondo", hex: "#17635E", why: "Il freddo pieno, l'unico che non ti spegne." },
      { name: "Melanzana", hex: "#3E2536", why: "Lo scuro con dentro il rosso." },
      { name: "Ruggine scura", hex: "#8A3B22", why: "L'arancio profondo, il tuo accento caldo." },
      { name: "Verde muschio", hex: "#3F4A25", why: "Il verde da capospalla." },
      { name: "Cammello scuro", hex: "#9C7A4E", why: "Il neutro medio che ti alza la luce." },
      { name: "Prugna calda", hex: "#5A2A33", why: "Il viola che ti riesce, perché tira al rosso." },
    ],
  },
  "Inverno freddo": {
    sottotono: "freddo", luce: "media", intensita: "alta",
    descrizione: "Freddi netti e saturi: il contrasto è il tuo alleato.",
    palette: [
      { name: "Bianco ottico", hex: "#FFFFFF", principale: true, why: "Nessun altro bianco ti rende giustizia." },
      { name: "Blu reale", hex: "#1B4FA0", principale: true, why: "Saturo e freddo: ti sta come una firma." },
      { name: "Rosso lampone", hex: "#B01F45", principale: true, why: "Il rosso col blu dentro." },
      { name: "Verde smeraldo", hex: "#0F7A5A", principale: true, why: "Freddo e brillante insieme." },
      { name: "Grigio antracite", hex: "#3A3D40", principale: true, why: "Il neutro scuro che regge il tuo contrasto." },
      { name: "Azzurro ghiaccio", hex: "#BFDCEF", why: "Il celeste gelido: su di te funziona come un bianco." },
      { name: "Blu notte", hex: "#1B2A41", why: "Il tuo scuro da sera, alternativo al nero." },
      { name: "Fucsia freddo", hex: "#B5327B", why: "Il rosa saturo, senza arancio dentro." },
      { name: "Ametista", hex: "#6B3F9E", why: "Il viola pieno: la tua intensità lo chiede." },
      { name: "Grigio ghiaccio", hex: "#D3D8DD", why: "Il chiaro neutro di tutti i giorni." },
      { name: "Verde pino", hex: "#12403A", why: "Il verde profondo che non vira al giallo." },
      { name: "Vinaccia fredda", hex: "#6B2233", why: "Il rosso scuro per la sera." },
    ],
  },
  "Inverno scuro": {
    sottotono: "freddo", luce: "scura", intensita: "alta",
    descrizione: "I contrasti forti e i colori profondi sono casa tua.",
    palette: [
      { name: "Bianco ghiaccio", hex: "#F7F9FB", principale: true, why: "Il massimo contrasto, che tu reggi." },
      { name: "Nero", hex: "#111213", principale: true, why: "Uno dei pochi tipi a cui sta davvero bene." },
      { name: "Blu notte", hex: "#1B2A41", principale: true, why: "Profondo, elegante, mai spento." },
      { name: "Vinaccia", hex: "#6B2233", principale: true, why: "Lo scuro con dentro il freddo." },
      { name: "Verde pino", hex: "#12403A", principale: true, why: "Il verde che non vira al giallo." },
      { name: "Azzurro ghiaccio", hex: "#C3DBEC", why: "Il celeste chiarissimo: contro il tuo scuro fa il contrasto che ti serve." },
      { name: "Blu reale profondo", hex: "#12397A", why: "Il blu pieno, il tuo colore da giorno." },
      { name: "Rosso rubino", hex: "#8E1230", why: "Il rosso profondo, mai aranciato." },
      { name: "Melanzana", hex: "#3B1E4A", why: "Il viola scuro che ti riesce naturale." },
      { name: "Grigio antracite", hex: "#34383C", why: "Il neutro che sostituisce il beige." },
      { name: "Smeraldo scuro", hex: "#0C5C46", why: "Verde saturo e freddo insieme." },
      { name: "Fucsia profondo", hex: "#9E1E63", why: "L'accento acceso, quando serve." },
    ],
  },
  "Inverno brillante": {
    sottotono: "freddo", luce: "media", intensita: "molto alta",
    descrizione: "Colori puri, senza mezze misure: pastelli e spenti ti spengono.",
    palette: [
      { name: "Bianco puro", hex: "#FFFFFF", principale: true, why: "Base netta, senza sfumature calde." },
      { name: "Fucsia", hex: "#C2286E", principale: true, why: "Saturo e freddo: la tua intensità lo chiede." },
      { name: "Turchese elettrico", hex: "#0E9AAE", principale: true, why: "Brillante come il tuo contrasto." },
      { name: "Blu cobalto", hex: "#1B4FA0", principale: true, why: "Pieno, mai polveroso." },
      { name: "Nero", hex: "#111213", principale: true, why: "Il tuo neutro, quello vero." },
      { name: "Azzurro ghiaccio", hex: "#BEE0F2", why: "Il celeste gelido, quello che ti illumina il viso." },
      { name: "Rosso vero", hex: "#CE1B34", why: "Il rosso puro, né aranciato né spento." },
      { name: "Smeraldo", hex: "#0E8A5F", why: "Il verde saturo che tieni testa." },
      { name: "Viola elettrico", hex: "#6A2FB0", why: "Pieno e freddo: sui pastelli ti spegneresti." },
      { name: "Limone freddo", hex: "#EBDE4C", why: "Il giallo senza oro dentro." },
      { name: "Grigio ghiaccio", hex: "#CFD6DC", why: "Il neutro chiaro di tutti i giorni." },
      { name: "Blu notte", hex: "#16264A", why: "Lo scuro elegante accanto al nero." },
    ],
  },
};

/**
 * Dalla misura alla stagione.
 *
 * Tre assi, e vanno tenuti distinti, perché è qui che si sbaglia:
 *
 *   sottotono   caldo o freddo
 *   profondità  quanto sei scuro NEL COMPLESSO — pelle e capelli insieme
 *   contrasto   quanto pelle e capelli sono distanti FRA LORO
 *
 * Profondità e contrasto sembrano la stessa cosa e non lo sono. Chi ha pelle
 * scura e capelli neri ha profondità bassissima e contrasto quasi nullo: è un
 * Inverno scuro, il tipo più netto che esista. Prima qui c'era solo il
 * contrasto, e quella persona finiva in "Estate spenta" — malva, tortora,
 * blu slavato. Il contrario esatto dei suoi colori.
 *
 * L'ordine delle domande conta quanto le soglie: prima quanto sei profondo,
 * poi quanto sei contrastato. Al contrario, chiunque avesse i capelli neri
 * usciva "brillante" e chiunque li avesse dello stesso tono della pelle
 * usciva "spento".
 *
 * @param sottotono   b* convenzionale: >= 17.5 è caldo
 * @param luce        L* della pelle
 * @param contrasto   |L pelle − L capelli|
 * @param profondita  media di L pelle e L capelli (se manca, si usa la pelle)
 */
export function stagioneDa({ sottotono, luce, contrasto, profondita }) {
  const caldo = sottotono >= 17.5;
  const prof = Number.isFinite(profondita) ? profondita : luce;

  // 1. La profondità parla per prima. Chi è scuro nel complesso sta nelle
  //    stagioni profonde qualunque sia il suo contrasto interno.
  if (prof <= 40) return caldo ? "Autunno scuro" : "Inverno scuro";

  //    Chi è chiaro dappertutto — pelle chiara E capelli chiari — sta nelle
  //    stagioni chiare. Il contrasto basso qui è una conferma, non un caso a
  //    parte: se fosse alto vorrebbe dire capelli scuri, e non saremmo qui.
  if (prof >= 64 && contrasto <= 34) return caldo ? "Primavera chiara" : "Estate chiara";

  // 2. Poi il contrasto, che dice quanto puri reggi i colori.
  if (contrasto >= 46) return caldo ? "Primavera brillante" : "Inverno brillante";
  if (contrasto <= 20) return caldo ? "Autunno spento" : "Estate spenta";

  // 3. In mezzo stanno le stagioni "vere", quelle di temperatura piena.
  if (caldo) return prof >= 52 ? "Primavera calda" : "Autunno caldo";
  return contrasto >= 38 ? "Inverno freddo" : "Estate fredda";
}

/** I cinque colori da mostrare per primi, con la spiegazione. */
export function principali(palette = []) {
  const scelti = palette.filter((c) => c.principale);
  return scelti.length ? scelti : palette.slice(0, 5);
}

// Quanto è chiaro un colore, da 0 a 100.
function luceDi(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return 50;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 2.55;
}

// A che altezza sta il baricentro di ogni periodo. Prima primavera ed estate
// avevano lo stesso ordine, e così autunno e inverno: quattro schede, due
// risposte. Con un bersaglio per periodo ognuno ha davvero i suoi.
const BERSAGLIO = { estate: 80, primavera: 62, autunno: 40, inverno: 20 };

/**
 * La palette non cambia col meteo — è il senso stesso dell'armocromia: i tuoi
 * colori sono i tuoi tutto l'anno. Quello che cambia è QUALI di quei colori
 * portare di più, e su che tessuti.
 *
 * D'estate salgono i chiari della tua palette, d'inverno i profondi. Non sono
 * colori nuovi: sono gli stessi, ordinati diversamente.
 */
export function paletteDelPeriodo(palette = [], periodo = "primavera") {
  const bersaglio = BERSAGLIO[periodo] ?? BERSAGLIO.primavera;
  const ordine = [...palette].sort(
    (a, b) => Math.abs(luceDi(a.hex) - bersaglio) - Math.abs(luceDi(b.hex) - bersaglio),
  );

  const note = {
    estate: "D'estate porta avanti i più chiari della tua palette: con la luce forte reggono meglio.",
    inverno: "D'inverno vengono avanti i tuoi colori profondi: con poca luce i chiari si spengono.",
    autunno: "In autunno i toni pieni di mezzo, sui tessuti più corposi.",
    primavera: "In primavera i tuoi colori più leggeri, su cotone e lino.",
  };

  return { ordine, nota: note[periodo] ?? note.primavera };
}
