import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { arricchisci, coloriVoluti, comeLoHaiChiamato, distribuisci, perChiCerca, senzaDoppioni } from "@/lib/capiPalette";
import { paroleDelloStile } from "@/lib/stiliCapi";
import { paroleEspanse } from "@/lib/sinonimi";

export const runtime = "nodejs";

// Trova nel catalogo i capi dei colori della palette.
//
// Il database screma con la distanza semplice, che è veloce su ventimila
// righe; qui riordiniamo i pochi rimasti con CIEDE2000, che corrisponde a
// come l'occhio giudica davvero due colori vicini.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { palette, min, max, genere, stile = null, capo = null, colore = null, escludiFast = false, quanti = 48 } = body || {};
  if (!Array.isArray(palette) || !palette.length) {
    return NextResponse.json({ error: "SERVE_LA_PALETTE" }, { status: 400 });
  }

  const tutti = coloriVoluti(palette);
  if (!tutti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  // Un colore scelto è una richiesta, non un suggerimento: chi apre la
  // tendina e dice "blu navy" vuole i capi blu navy, non la palette intera
  // con i blu navy in mezzo. Se il nome non si riconosce si cerca in tutta
  // la palette, perché rispondere niente sarebbe peggio.
  const soloQuesto = colore ? tutti.filter((c) => c.nome === colore) : [];
  const voluti = soloQuesto.length ? soloQuesto : tutti;

  // Le parole della casella "che capo cerchi". Sono quelle che restringono di
  // più, quindi è a loro che conviene far fare la scrematura nel database:
  // lo stile, se c'è anche quello, riordina dopo.
  // Con la famiglia dietro: chi scrive "stivali" deve pescare anche i boots,
  // che in catalogo sono quattordici volte tanti. Qui si è larghi apposta —
  // serve solo a non leggere tutto il catalogo — e a stringere ci pensa
  // comeLoHaiChiamato, che sa distinguere una camicia da una t-shirt.
  const paroleCapo = String(capo || "").trim() ? paroleEspanse(capo) : null;

  // Quanti capi chiedere al database. Ne servono molti più di quanti se ne
  // mostrano: il database ordina per distanza, e senza margine tornerebbero
  // tutti dello stesso colore. Ma il margine si commisura alla richiesta —
  // la pagina degli stili ne mostra quattro per stile e ne chiede cinque
  // volte di fila, e pescarne quattrocento ogni volta sarebbe lentissimo.
  const quantiChiedere = Math.min(400, Math.max(80, (Number(body?.quanti) || 48) * 8));
  // Le parole dello stile tornano al database, tutte, senza tagli. Ci erano
  // state tolte perché il filtro costava tre secondi: guardava cinque campi
  // per parola su ogni riga. Adesso guarda una colonna sola e indicizzata, e
  // otto parole di «Romantico» su quattro colori costano 0,9 s invece di un
  // errore — meno di quanto costi la stessa ricerca SENZA parole, perché il
  // filtro scarta le righe prima che se ne calcolino le distanze.
  const paroleDaCercare = paroleCapo?.length ? paroleCapo : stile ? paroleDelloStile(stile) : null;

  /**
   * Due ricerche, e si sceglie in base a cosa è stato chiesto.
   *
   * Non è indecisione: sono due domande diverse, e vogliono due strategie
   * opposte. Misurato oggi sul catalogo vero, dodici colori:
   *
   *                        capi_per_palette   capi_per_palette_v2
   *   senza parole            FUORI TEMPO          378-434 ms
   *   con parole («stivali»)      479 ms           FUORI TEMPO
   *
   * La v2 chiede all'indice spaziale «i più vicini a questo colore» e le
   * altre righe non le tocca: imbattibile quando i colori sono tutto quello
   * che si sa. Ma con una parola scritta deve continuare a camminare
   * l'indice finché non trova capi che quella parola ce l'hanno davvero, e
   * su una parola rara cammina all'infinito. Lì vince l'altra, che parte
   * dalla parola — l'indice a trigrammi le dà subito le poche righe giuste —
   * e le distanze le calcola solo su quelle.
   *
   * Quindi: chi cerca per colore va alla v2, chi ha scritto una parola alla
   * prima. Restituiscono le stesse identiche colonne.
   */
  const soloColori = !paroleDaCercare?.length;

  const cerca = (colori) =>
    supabase.rpc(soloColori ? "capi_per_palette_v2" : "capi_per_palette", {
      palette: colori.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
      prezzo_min: min ? Number(min) : null,
      prezzo_max: max ? Number(max) : null,
      genere_voluto: genere || null,
      escludi_fast: Boolean(escludiFast),
      quanti: quantiChiedere,
      parole: paroleDaCercare,
    });

  /**
   * La palette intera, in una domanda sola.
   *
   * Spezzarla è stato giusto per un mese e adesso non lo è più, e la
   * differenza l'hanno fatta i due indici. Serviva perché il costo cresceva
   * con i colori fino a sfondare i tre secondi che il database concede — a
   * sei colori ci si sbatteva contro — quindi si chiedevano gruppetti in
   * fila, pagando la somma: quattro-sei secondi per una schermata.
   *
   * Con l'indice spaziale sui colori e quello a trigrammi sulle parole il
   * costo non cresce più così. Misurato oggi sul catalogo vero, una domanda
   * sola con tutti e dodici i colori:
   *
   *   senza parole ............................  378-434 ms
   *   «stivali» ...............................  340-357 ms
   *   «camicia», nessun genere ................ 1268-1461 ms
   *   «cardigan oversize», nessun genere ...... 1368-1400 ms
   *
   * E dodici colori costano quanto tre: «camicia» con tre colori sta a 576
   * ms, con dodici a 972. Spezzare in quattro e chiedere in fila costava
   * quattro volte tanto per non guadagnare niente.
   *
   * Il caso peggiore misurato — nessun genere, fast fashion incluso,
   * quattrocento righe, parola comune — sta a 1,4 secondi: metà del limite.
   */
  const risposta = await cerca(voluti);
  let data = risposta.data || [];
  let error = risposta.error || null;

  // Se anche così non ci sta, si ripiega sui colori che contano: la palette
  // ne segna cinque come principali, ed è su quelli che l'analisi si è
  // sbilanciata. Una risposta più stretta, non una sbagliata.
  if (error && /timeout|57014|canceling statement/i.test(error.message || "")) {
    const principali = voluti.filter((c) => c.principale);
    const ridotti = principali.length >= 3 ? principali : voluti.slice(0, 5);
    const ripiego = await cerca(ridotti);
    data = ripiego.data || [];
    error = ripiego.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const capi = arricchisci(data, voluti).sort((a, b) => a.scarto - b.scarto);

  // Chi ha scritto che capo cerca lo ha scritto per essere ascoltato: il
  // database screma all'ingrosso, qui si tiene solo quello che c'entra.
  const richiesti = comeLoHaiChiamato(capi, capo);

  const quantiNeVoglio = Math.min(120, Math.max(12, Number(quanti) || 48));
  // La distribuzione serve a non dare dodici capi tutti dello stesso colore
  // quando non è stato chiesto niente. Ma quando qualcosa è stato chiesto,
  // rimescola: girando fra un colore e l'altro rimetteva in alto capi meno
  // pertinenti, e una maglia di COLORE jeans risaliva all'ottavo posto fra i
  // "jeans baggy". Chi ha scritto cosa cerca vuole prima quello, e i colori
  // se li guarda nell'ordine che viene.
  const ordinati = soloQuesto.length || paroleCapo?.length
    ? senzaDoppioni(richiesti)
    : distribuisci(senzaDoppioni(richiesti), voluti);

  // Per ultimo chi sta guardando: via i capi da bambino e quelli del genere
  // sbagliato, e i capi senza genere scritto in fondo invece che in mezzo.
  const scelti = perChiCerca(ordinati, genere).slice(0, quantiNeVoglio);

  return NextResponse.json({ ok: true, capi: scelti, quanti: scelti.length });
}
