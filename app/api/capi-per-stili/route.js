import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { paroleDellaFamiglia, paroleDelloStile } from "@/lib/stiliCapi";
import { arricchisci, coloriVoluti, distribuisci, perChiCerca, senzaDoppioni } from "@/lib/capiPalette";
import { ruoloDelCapo } from "@/lib/periodiAnno";

export const runtime = "nodejs";

// Qualche capo per ognuno degli stili consigliati, in UNA interrogazione.
//
// La prima versione ne faceva una per stile, cinque in parallelo. Il database
// le ha rifiutate tutte e cinque: "canceling statement due to statement
// timeout", tre secondi a testa. La ricerca per palette scorre tutta la
// tabella — è una scelta scritta in ricerca_capi.sql, e su una query sola è
// la più veloce — ma cinque insieme non ci stanno.
//
// Nemmeno una sola, però, se le si passano le parole di tutti e cinque: le
// settanta parole in OR sulla scansione completa sfondavano il timeout da
// sole. Quindi al database si chiede solo il COLORE, che è la parte che sa
// fare in fretta, e la divisione per stile si fa qui sulle righe già
// arrivate — dove confrontare quattrocento titoli con settanta parole non
// costa niente. Il database lavora una volta, e lavora poco.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { palette, stili = [], genere = null, escludiFast = false, perStile = 4, min = null, max = null } = body || {};
  if (!Array.isArray(palette) || !palette.length) {
    return NextResponse.json({ error: "SERVE_LA_PALETTE" }, { status: 400 });
  }
  const nomi = (Array.isArray(stili) ? stili : []).filter(Boolean).slice(0, 6);
  if (!nomi.length) return NextResponse.json({ ok: true, perStile: {} });

  const voluti = coloriVoluti(palette);
  if (!voluti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  const paroleDi = new Map(nomi.map((n) => [n, paroleDelloStile(n).map((k) => k.toLowerCase())]));

  // Qui le parole non si usano — gli stili si scelgono dopo, fra le righe già
  // in mano — quindi è sempre il caso in cui l'indice spaziale vince.
  const { data, error } = await supabase.rpc("capi_per_palette_v2", {
    palette: voluti.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
    // Il budget dichiarato nel questionario: consigliare un cappotto da
    // seicento euro a chi ne ha detti cinquanta non è un consiglio.
    prezzo_min: min ? Number(min) : null,
    prezzo_max: max ? Number(max) : null,
    genere_voluto: genere || null,
    escludi_fast: Boolean(escludiFast),
    // Largo: da qui in poi si scarta per stile, e uno stile di nicchia in un
    // bacino stretto resterebbe a mani vuote.
    quanti: 400,
    parole: null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Solo cose che si indossano. In catalogo ci sono anche vuotatasche,
  // candele e oggetti da casa: hanno un colore come tutto il resto, e senza
  // questo filtro finivano fra i capi di uno stile. Chi non ha un ruolo
  // riconoscibile — sopra, sotto, scarpe, accessorio — non è un capo.
  // E per la stessa ragione: chi ha detto di essere uomo non deve trovare
  // reggiseni sotto i suoi stili, e nessuno deve trovarci scarpe da neonato.
  // Il genere scritto nel catalogo manca su un capo su tre, quindi non basta
  // chiederlo al database: qui si guarda anche cosa dice il titolo.
  const capi = perChiCerca(
    senzaDoppioni(
      arricchisci(data, voluti)
        .filter((c) => ruoloDelCapo(c.titolo, c.categoria))
        .sort((a, b) => a.scarto - b.scarto),
    ),
    genere,
  );

  // Un capo va a un solo stile: lo stesso maglione mostrato sotto tutti e
  // cinque farebbe pensare che gli stili non contino niente. Vince chi lo
  // nomina per primo, cioè lo stile più adatto secondo l'ordine del consiglio.
  const presi = new Set();
  const quanti = Math.min(8, Math.max(1, Number(perStile) || 4));
  const fuori = {};

  // Ogni stile deve avere le sue foto.
  //
  // Con le sole parole dello stile, "Total black" su una palette salvia
  // trovava un capo, "Gorpcore" uno: tre riquadri vuoti in mezzo a schede
  // piene sembrano un guasto, e chi guarda non sceglie. Quindi si prova in
  // tre giri, e si scende di precisione solo quando serve.
  const libero = (c) => !presi.has(c.id);
  const conParole = (chiavi) => (c) => {
    if (!libero(c)) return false;
    const t = `${c.titolo || ""} ${c.categoria || ""}`.toLowerCase();
    return chiavi.some((k) => t.includes(k));
  };

  for (const nome of nomi) {
    const scelti = [];
    const aggiungi = (candidati) => {
      for (const c of distribuisci(candidati, voluti)) {
        if (scelti.length >= quanti) break;
        if (scelti.some((x) => x.id === c.id)) continue;
        scelti.push(c);
        presi.add(c.id);
      }
    };

    // 1. le parole dello stile.
    aggiungi(capi.filter(conParole(paroleDi.get(nome) || [])));

    // 2. quelle della sua famiglia: capi che a chi ha scelto quello stile
    //    non stonano, anche se non lo nominano.
    if (scelti.length < quanti) {
      aggiungi(capi.filter(conParole(paroleDellaFamiglia(nome).map((k) => k.toLowerCase()))));
    }

    // 3. e se anche la famiglia è a secco, i capi più vicini ai suoi colori.
    //    Meno preciso, ma è pur sempre roba che gli sta bene addosso — e
    //    tre foto valgono più di tre buchi.
    if (scelti.length < quanti) aggiungi(capi.filter(libero));

    fuori[nome] = scelti;
  }

  return NextResponse.json({ ok: true, perStile: fuori });
}
