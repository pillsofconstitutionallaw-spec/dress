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
  const paroleDaCercare = paroleCapo?.length ? paroleCapo : stile ? paroleDelloStile(stile) : null;

  const cerca = (colori) =>
    supabase.rpc("capi_per_palette", {
      palette: colori.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
      prezzo_min: min ? Number(min) : null,
      prezzo_max: max ? Number(max) : null,
      genere_voluto: genere || null,
      escludi_fast: Boolean(escludiFast),
      quanti: quantiChiedere,
      parole: paroleDaCercare,
    });

  /**
   * La palette a metà, e le due metà chieste insieme.
   *
   * Il costo della ricerca è lineare nei colori — misurato sul catalogo
   * vero, guardaroba da donna: un colore 0,4 s, cinque 1,5 s, dodici 3,0 s —
   * e il database concede tre secondi a una domanda. Dodici colori contro il
   * guardaroba femminile, che in catalogo è quasi il doppio di quello
   * maschile, ci sbattevano contro: l'utente vedeva un errore.
   *
   * Spezzarla non cambia il risultato, e non è un compromesso. La distanza
   * di un capo dalla palette è la più piccola fra le sue distanze dai
   * singoli colori, e il più piccolo di dodici numeri è il più piccolo fra
   * il minimo dei primi sei e il minimo degli altri sei. Due domande da sei
   * danno le stesse righe di una da dodici — e chi decide davvero l'ordine è
   * arricchisci() qui sotto, che il colore più vicino se lo ricalcola da sé
   * su tutta la palette.
   *
   * Due domande in parallelo costano quanto la più lenta delle due, non la
   * somma: la metà del lavoro, nella metà del tempo.
   */
  const META = 6;
  const gruppi = [];
  for (let i = 0; i < voluti.length; i += META) gruppi.push(voluti.slice(i, i + META));

  const risposte = await Promise.all(gruppi.map(cerca));
  const fallito = risposte.find((r) => r.error);
  let data = risposte.flatMap((r) => r.data || []);
  let error = fallito?.error || null;

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
