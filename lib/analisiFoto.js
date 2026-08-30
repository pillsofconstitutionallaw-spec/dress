"use client";

import { rgbALab } from "@/lib/colore";
import { indizioPelle, labDelTono } from "@/lib/pelle";
import { STAGIONI, stagioneDa } from "@/lib/stagioni";
import { combina, esitoDelTest } from "@/lib/testArmocromia";

// Il motore di analisi di Dress.
//
// Legge la foto, misura il colore della pelle e dei capelli, e da lì ricava
// la stagione armocromatica. Nessun modello linguistico, nessuna chiave,
// nessun credito: sono tre numeri e una tabella.
//
// Gira nel browser. La foto non lascia il dispositivo — cosa che nessuna
// analisi fatta da un servizio esterno potrà mai promettere.

// La pelle umana, di qualunque colore, occupa una zona ristretta e nota dello
// spazio Lab: tinta fra il rosso e l'arancio, mai verde o blu. È questo che
// permette di riconoscerla senza cercare un volto.
// Esportata perché è una regola del mestiere, non un dettaglio di come è
// scritto il codice: dice dove sta la pelle umana nello spazio dei colori, e
// se un giorno cambia deve cambiare davanti a una prova che lo dichiara.
export function sembraPelle({ L, a, b }) {
  if (L < 15 || L > 96) return false;
  if (a < 3 || a > 28) return false;
  if (b < 6 || b > 42) return false;
  const tinta = (Math.atan2(b, a) * 180) / Math.PI;
  return tinta > 20 && tinta < 78;
}

function mediana(valori) {
  const v = [...valori].sort((x, y) => x - y);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Media troncata: si buttano il 20% più estremo sopra e sotto, poi si fa la
// media del resto. Regge meglio della mediana secca, perché usa tutti i
// campioni buoni invece di uno solo, e meglio della media, che un riflesso
// sulla fronte o un'ombra sotto il mento basterebbero a spostare.
function troncata(valori, taglio = 0.2) {
  const v = [...valori].sort((x, y) => x - y);
  const da = Math.floor(v.length * taglio);
  const a = Math.ceil(v.length * (1 - taglio));
  const centro = v.slice(da, Math.max(da + 1, a));
  return centro.reduce((s, x) => s + x, 0) / centro.length;
}

function riassumi(pixel) {
  if (!pixel.length) return null;
  return {
    L: troncata(pixel.map((p) => p.L)),
    a: troncata(pixel.map((p) => p.a)),
    b: troncata(pixel.map((p) => p.b)),
    // Quanto sono sparsi i campioni: se la pelle misurata è tutta diversa da
    // sé stessa, vuol dire che abbiamo preso dentro anche altro.
    dispersione: Math.round(
      Math.sqrt(pixel.reduce((s, p) => s + (p.b - troncata(pixel.map((x) => x.b))) ** 2, 0) / pixel.length),
    ),
  };
}

/**
 * Corregge la dominante di colore della luce.
 *
 * È il passaggio che decide tutto. Una lampadina di casa butta giallo su
 * ogni cosa: senza correggerlo, misuriamo il giallo della lampadina e lo
 * scambiamo per il sottotono della pelle, e un tipo freddo viene classificato
 * caldo. È l'errore che rende inservibile l'armocromia fatta da foto.
 *
 * Metodo: si cercano i pixel che nella realtà DEVONO essere neutri — i più
 * chiari e i meno colorati della foto: il bianco degli occhi, una parete, una
 * camicia bianca — e si calcola di quanto la luce li ha spostati. Poi si
 * riporta indietro tutta l'immagine della stessa quantità.
 */
export function correggiLuce(rgb) {
  // Candidati neutri: chiari, e con i tre canali già vicini fra loro.
  const candidati = rgb.filter(({ r, g, b }) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max > 150 && max < 252 && max - min < 42;
  });

  if (candidati.length < 30) return { fattori: { r: 1, g: 1, b: 1 }, affidabile: false };

  // Il quinto più chiaro fra i candidati: è quello che nella realtà è bianco.
  const ordinati = [...candidati].sort((x, y) => (y.r + y.g + y.b) - (x.r + x.g + x.b));
  const bianchi = ordinati.slice(0, Math.max(20, Math.round(ordinati.length * 0.2)));

  const media = ["r", "g", "b"].map((c) => bianchi.reduce((s, p) => s + p[c], 0) / bianchi.length);
  const grigio = (media[0] + media[1] + media[2]) / 3;

  // Correzione limitata: se la foto è davvero monocroma non vogliamo
  // inventarci colori che non ci sono.
  const limita = (f) => Math.min(1.35, Math.max(0.74, f));

  return {
    fattori: { r: limita(grigio / media[0]), g: limita(grigio / media[1]), b: limita(grigio / media[2]) },
    affidabile: true,
    dominante: Math.round(Math.max(...media) - Math.min(...media)),
  };
}

// Disegna la foto piccola e restituisce i pixel, con la posizione.
//
// Qui dentro c'è l'unica riga che ha bisogno di un browser: il canvas, cioè
// il foglio di brutta su cui si ricopia la foto per poterla misurare. Non
// finisce mai nella pagina, nessuno lo vede, serve solo a trasformare
// un'immagine in numeri — una cosa che un <img> non sa fare.
function pixelDa(immagine, lato = 96) {
  const canvas = document.createElement("canvas");
  canvas.width = lato;
  canvas.height = lato;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(immagine, 0, 0, lato, lato);
  return daiPixelGrezzi(ctx.getImageData(0, 0, lato, lato).data, lato);
}

/**
 * Dalla fila di numeri ai pixel utilizzabili.
 *
 * `dati` è come lo consegna il browser: una fila unica, quattro caselle per
 * pixel — rosso, verde, blu, opacità — una di seguito all'altra. Da qui in
 * poi di browser non ce n'è più bisogno, ed è per questo che questa metà sta
 * per conto suo: è la parte che ragiona, e va potuta provare senza uno
 * schermo. Chiunque sappia produrre quella fila — il canvas nel telefono,
 * sharp in un programma, una prova che se la costruisce a mano — può
 * chiamarla.
 */
export function daiPixelGrezzi(dati, lato) {
  // Prima si raccolgono i colori grezzi, poi si corregge la luce, e solo
  // dopo si passa in Lab: correggere dopo la conversione non funzionerebbe.
  const grezzi = [];
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const i = (y * lato + x) * 4;
      if (dati[i + 3] < 200) continue;
      grezzi.push({ x: x / lato, y: y / lato, r: dati[i], g: dati[i + 1], b: dati[i + 2] });
    }
  }

  const luce = correggiLuce(grezzi);
  const f = luce.fattori;
  const limite = (v) => Math.min(255, Math.max(0, v));

  return {
    pixel: grezzi.map((p) => ({
      x: p.x,
      y: p.y,
      ...rgbALab({ r: limite(p.r * f.r), g: limite(p.g * f.g), b: limite(p.b * f.b) }),
    })),
    luce,
  };
}

function caricaImmagine(dataUrl) {
  return new Promise((risolvi, rifiuta) => {
    const img = new Image();
    img.onload = () => risolvi(img);
    img.onerror = rifiuta;
    img.src = dataUrl;
  });
}

/**
 * Le condizioni sono buone abbastanza per misurare?
 *
 * È la prima cosa che fa un armocromista: se la luce è sbagliata non tira a
 * indovinare, ti sposta vicino alla finestra. Una risposta sbagliata data con
 * sicurezza è peggio di una richiesta di rifare la foto.
 */
function valutaCondizioni({ pixel, luce, pelleCandidata, centrali }) {
  const problemi = [];

  const luminositaMedia = pixel.reduce((s, p) => s + p.L, 0) / (pixel.length || 1);
  if (luminositaMedia < 28) problemi.push("La foto è troppo scura: al buio i colori della pelle non si distinguono.");
  if (luminositaMedia > 88) problemi.push("La foto è troppo chiara e il viso risulta bruciato: i colori si perdono.");

  const quotaViso = centrali.length ? pelleCandidata.length / centrali.length : 0;
  if (quotaViso < 0.14) problemi.push("Il viso occupa troppo poco spazio: avvicinati o inquadra solo il volto.");

  // Una dominante fortissima non si corregge senza inventare: meglio dirlo.
  if (luce?.dominante > 62) problemi.push("La luce ha una dominante di colore troppo forte per essere corretta. Serve luce naturale, vicino a una finestra.");
  if (!luce?.affidabile) problemi.push("Nella foto non c'è niente di bianco o neutro da cui capire com'era la luce. Aiuta avere uno sfondo chiaro.");

  return {
    utilizzabile: problemi.length === 0,
    // Con un problema solo si misura lo stesso, dicendolo. Con due o più no.
    affidabile: problemi.length === 0,
    problemi,
    luminositaMedia: Math.round(luminositaMedia),
    quotaViso: Number(quotaViso.toFixed(2)),
  };
}

/**
 * Misura pelle e capelli da un primo piano.
 * Ritorna null se la foto non è leggibile o non contiene abbastanza incarnato.
 */
export async function misuraDaFoto(dataUrl) {
  if (!dataUrl) return null;

  // Nel riparo ci sta solo la lettura: una foto illeggibile è un fatto della
  // vita e si risponde "niente". Se invece fosse il ragionamento a rompersi
  // sarebbe un difetto nostro, e inghiottirlo qui vorrebbe dire non saperlo
  // mai — l'analisi proseguirebbe come se la foto non fosse stata caricata.
  let letti;
  try {
    letti = pixelDa(await caricaImmagine(dataUrl));
  } catch {
    return null;
  }
  return misuraDaiPixel(letti);
}

/**
 * Dove sta la pelle, dove stanno i capelli, e se la foto valeva qualcosa.
 *
 * È il ragionamento vero, e non tocca né il browser né un'immagine: prende i
 * pixel già letti e risponde. Sta staccato da chi glieli porta perché era
 * l'unico pezzo importante del progetto che nessuna prova poteva raggiungere
 * — per provarlo serviva uno schermo, e le prove girano senza.
 */
export function misuraDaiPixel({ pixel, luce }) {
  // La pelle si misura dove la pelle è pelle: guance e fronte. Prendere tutto
  // il centro del viso significa prendere dentro labbra, occhi, sopracciglia,
  // barba e ombre — tutte cose che spostano la misura.
  const zoneViso = (p) =>
    // fronte
    (p.y > 0.20 && p.y < 0.34 && p.x > 0.34 && p.x < 0.66) ||
    // guancia sinistra e destra, sotto gli occhi e sopra la bocca
    (p.y > 0.44 && p.y < 0.62 && ((p.x > 0.24 && p.x < 0.40) || (p.x > 0.60 && p.x < 0.76)));

  const centrali = pixel.filter(zoneViso);
  const pelleCandidata = centrali.filter(sembraPelle);
  const condizioni = valutaCondizioni({ pixel, luce, pelleCandidata, centrali });
  if (pelleCandidata.length < centrali.length * 0.08) {
    return { fallita: true, condizioni };
  }

  const pelle = riassumi(pelleCandidata);

  // I capelli: nella fascia alta, e sono la parte più scura che NON è pelle.
  // Si prende il quarto più scuro, così una ciocca chiara non falsa tutto.
  const alto = pixel.filter((p) => p.y < 0.42 && !sembraPelle(p));
  const scuri = [...alto].sort((x, y) => x.L - y.L).slice(0, Math.max(12, Math.round(alto.length * 0.25)));
  const capelli = riassumi(scuri) || { L: pelle.L - 25, a: pelle.a, b: pelle.b };

  return {
    pelle,
    capelli,
    contrasto: Math.abs(pelle.L - capelli.L),
    luce,
    condizioni,
    campioni: { pelle: pelleCandidata.length, capelli: scuri.length },
  };
}

// Quando i capelli sono dichiarati a parole, valgono più di una misura presa
// da una foto con la luce sbagliata: chi risponde "biondi" lo sa meglio di noi.
const LUCE_CAPELLI = {
  Neri: 18, "Castano scuro": 30, "Castano chiaro": 46, Biondi: 68,
  Rossi: 42, "Grigi / Sale e pepe": 62, Bianchi: 84, Colorati: null,
};

// Occhi e capelli sono indizi forti sul sottotono, e sono DICHIARATI: non
// dipendono dalla luce della stanza. Un consulente li guarda per primi.
// Positivo = caldo, negativo = freddo.
const INDIZIO_OCCHI = {
  Azzurri: -2.4, Grigi: -2.2, Verdi: -1.1, Nocciola: 0.8, Marroni: 0.9, Ambra: 1.8,
};
const INDIZIO_CAPELLI = {
  Neri: -0.8, "Castano scuro": -0.3, "Castano chiaro": 0.5, Biondi: 0.7,
  Rossi: 2.0, "Grigi / Sale e pepe": -1.2, Bianchi: -1.4, Colorati: 0,
};

/**
 * Caldo o freddo.
 *
 * Non dal giallo assoluto della pelle — che dipende troppo da luce e
 * abbronzatura — ma dall'INCLINAZIONE del colore: quanto rosa c'è rispetto al
 * giallo. È l'angolo di tinta, ed è la misura che regge anche quando la foto
 * non è perfetta.
 *
 * Poi si incrociano gli indizi dichiarati. Occhi azzurri e capelli neri sono
 * un tipo freddo anche se la foto è stata scattata sotto una lampadina gialla:
 * quando la misura e i dichiarati litigano, non vince la misura per forza.
 */
function decidiSottotono({ pelle, profile, luceAffidabile }) {
  const angolo = (Math.atan2(pelle.b, pelle.a) * 180) / Math.PI;

  let punteggio = 0;

  if (pelle.dichiarato) {
    // Colore non misurato ma scelto fra i campioncini. Qui l'angolo non serve
    // e anzi inganna: un campione scuro è poco saturo, la sua inclinazione
    // vale poco, e sulle pelli profonde uscivano numeri a caso. Vale invece
    // il sottotono che quel tono ha per definizione — scritto in tabella
    // accanto al colore, dove si può leggere e discutere.
    punteggio += indizioPelle(profile.pelle) * 1.6;
  } else if (pelle.inventato) {
    // Niente foto e niente colore scelto: la pelle qui sopra è un incarnato
    // medio di comodo, non la sua. Farla pesare voleva dire dichiarare
    // "caldo" a chiunque non caricasse una foto, con la sicurezza di una
    // misura che non è stata fatta. Meglio zero: decidono occhi e capelli, e
    // la certezza scende abbastanza da aprire il drappeggio.
  } else {
    // Sotto i 48° la pelle tira al rosa, sopra i 55° al giallo. In mezzo la
    // misura da sola non decide, e comandano gli indizi.
    if (angolo < 48) punteggio -= 2.2;
    else if (angolo > 55) punteggio += 2.2;
    else punteggio += (angolo - 51.5) / 1.6;

    // Se la luce non era correggibile, la misura pesa la metà.
    if (!luceAffidabile) punteggio *= 0.5;

    // La foto l'abbiamo misurata, ma il colore dichiarato resta una prova:
    // pesa come gli occhi e i capelli, che sono anch'essi dichiarati.
    punteggio += indizioPelle(profile.pelle);
  }

  punteggio += INDIZIO_OCCHI[profile.eyes] ?? 0;
  punteggio += INDIZIO_CAPELLI[profile.hair] ?? 0;

  return {
    sottotono: punteggio >= 0 ? "caldo" : "freddo",
    // Quanto siamo sicuri: serve a dire all'utente se il caso è al limite.
    certezza: Math.min(1, Math.abs(punteggio) / 4),
    angolo: Math.round(angolo),
  };
}

/**
 * L'analisi completa: dalla foto e dai dati dichiarati alla stagione e ai
 * cinque colori. Funziona anche senza foto, con i soli dati del questionario.
 */
export async function analizzaColori({
  profile = {}, closeup = null, fullbody = null, correzione = null, testRisposte = null,
} = {}) {
  // Due scatti misurati separatamente. Se danno lo stesso sottotono, la
  // certezza sale; se litigano, scende — ed è giusto che scenda, perché
  // vuol dire che almeno uno dei due è stato ingannato dalla luce.
  const [primo, secondo] = await Promise.all([
    closeup ? misuraDaFoto(closeup) : null,
    fullbody ? misuraDaFoto(fullbody) : null,
  ]);

  const grezza = primo?.fallita ? null : primo;
  const seconda = secondo?.fallita ? null : secondo;
  const misura = grezza || seconda;
  const condizioni = primo?.condizioni || secondo?.condizioni || null;

  // Senza foto leggibile si usa quello che la persona ha dichiarato: meno
  // preciso, ma un risultato onesto è meglio di un rifiuto.
  const luceCapelliDichiarata = LUCE_CAPELLI[profile.hair] ?? null;

  // Senza foto leggibile comanda il colore che la persona ha scelto guardando
  // i campioncini. Prima qui c'era un incarnato medio inventato — chiaro e
  // giallino — e da quello usciva "caldo" per chiunque non caricasse una foto.
  const pelle = misura?.pelle || labDelTono(profile.pelle) || { L: 66, a: 12, b: 19, inventato: true };
  const luceCapelli = luceCapelliDichiarata ?? misura?.capelli?.L ?? 34;
  const contrasto = Math.abs(pelle.L - luceCapelli);

  // Quanto sei scuro nel complesso. È una misura diversa dal contrasto, e
  // serve a non scambiare "pelle e capelli dello stesso tono" per "colori
  // spenti": su chi ha la pelle scura e i capelli neri quella differenza è
  // quasi zero, ma di spento non c'è niente.
  const profondita = (pelle.L + luceCapelli) / 2;

  const tono = decidiSottotono({
    pelle,
    profile,
    luceAffidabile: Boolean(misura?.luce?.affidabile),
  });

  // Il controllo incrociato fra i due scatti.
  let accordoFoto = null;
  if (grezza && seconda) {
    const altro = decidiSottotono({ pelle: seconda.pelle, profile, luceAffidabile: Boolean(seconda.luce?.affidabile) });
    accordoFoto = altro.sottotono === tono.sottotono;
    tono.certezza = accordoFoto ? Math.min(1, tono.certezza * 1.35) : tono.certezza * 0.45;
  }

  // Campioni troppo sparsi = abbiamo misurato anche cose che pelle non sono.
  if ((misura?.pelle?.dispersione ?? 0) > 9) tono.certezza *= 0.6;

  // Le domande dell'armocromista pesano più della foto: riguardano come
  // reagisci alla luce nella vita, non come sei venuto in uno scatto.
  const test = esitoDelTest(testRisposte || {});
  const unito = combina({
    testEsito: test,
    misuraSottotono: tono.sottotono,
    misuraCertezza: tono.certezza,
  });

  // E chi si corregge a mano comanda su tutto: nessuna misura vale quanto
  // una persona che si guarda allo specchio.
  const sottotono = correzione?.sottotono || unito.sottotono;

  const luceFinale = correzione?.luce ?? pelle.L;
  const stagione = stagioneDa({
    sottotono: sottotono === "caldo" ? 25 : 8,
    luce: luceFinale,
    contrasto: correzione?.contrasto ?? contrasto,
    // Se la luminosità è stata corretta a mano, la profondità la segue.
    profondita: correzione?.luce != null ? (correzione.luce + luceCapelli) / 2 : profondita,
  });
  const dati = STAGIONI[stagione];

  // La soglia sotto la quale NON si dà un verdetto.
  //
  // È questo che rende l'analisi quasi sempre giusta: non una misura più
  // furba, ma il rifiuto di rispondere quando i dati non bastano. Un
  // armocromista incerto guarda ancora, non tira a indovinare.
  const certezzaFinale = correzione?.sottotono
    ? 1
    : test
      ? unito.certezza ?? 0.7
      : tono.certezza;

  const sicuri = certezzaFinale >= 0.42;

  return {
    season: stagione,
    descrizione: dati.descrizione,
    palette: dati.palette,
    certezza: Number(certezzaFinale.toFixed(2)),
    // Quando è sotto soglia l'app non afferma: apre il drappeggio.
    daConfermare: !sicuri,
    misura: {
      sottotono,
      daTest: Boolean(test),
      testConcorde: unito.concordi,
      fonteSottotono: correzione?.sottotono ? "tua correzione" : unito.fonte,
      certezza: Number(tono.certezza.toFixed(2)),
      angolo: tono.angolo,
      luminosita: Math.round(pelle.L),
      pelleDichiarata: profile.pelle || null,
      pelleDaDichiarazione: Boolean(pelle.dichiarato),
      contrasto: Math.round(contrasto),
      profondita: Math.round(profondita),
      daFoto: Boolean(misura),
      condizioni,
      accordoFoto,
      dueScatti: Boolean(grezza && seconda),
      luceCorretta: Boolean(misura?.luce?.affidabile),
      dominante: misura?.luce?.dominante ?? null,
      corretta: Boolean(correzione?.sottotono),
    },
    fonte: misura ? "foto" : "questionario",
  };
}
