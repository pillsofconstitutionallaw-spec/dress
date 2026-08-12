// Ricerca di un capo su Google, ristretta e pre-filtrata da noi.
//
// Non leggiamo i risultati di Google — non si può e non si deve. Quello che
// facciamo è costruire la domanda giusta prima di spedirla: descrizione del
// capo, colore della palette, taglia, fascia di prezzo e negozi ammessi.
//
// Nota onesta: i parametri di Google Shopping (tbs) non sono documentati e
// possono cambiare senza preavviso. Se un giorno la fascia di prezzo smette
// di essere applicata, è lì che bisogna guardare.

// I negozi su cui restringiamo la ricerca. "fast" segnala il fast fashion,
// "fascia" serve a non proporre una cravatta da 150 € a chi ne ha 40.
export const NEGOZI = [
  { nome: "COS", dominio: "cos.com", fast: false, fascia: "medio" },
  { nome: "Arket", dominio: "arket.com", fast: false, fascia: "medio" },
  { nome: "Massimo Dutti", dominio: "massimodutti.com", fast: false, fascia: "medio" },
  { nome: "Uniqlo", dominio: "uniqlo.com", fast: false, fascia: "accessibile" },
  { nome: "Ernesto Casolla", dominio: "ernestocasolla.it", fast: false, fascia: "medio" },
  { nome: "Sonny Bono", dominio: "sonnybono.com", fast: false, fascia: "medio" },
  { nome: "Marinella", dominio: "emarinella.eu", fast: false, fascia: "alto" },
  { nome: "Piazza Italia", dominio: "piazzaitalia.it", fast: true, fascia: "accessibile" },
  { nome: "Zara", dominio: "zara.com", fast: true, fascia: "accessibile" },
  { nome: "H&M", dominio: "hm.com", fast: true, fascia: "accessibile" },
  { nome: "Mango", dominio: "mango.com", fast: true, fascia: "accessibile" },
  { nome: "Vinted", dominio: "vinted.it", fast: false, fascia: "second-hand" },
];

// Dal budget dichiarato dall'utente alla fascia da cercare: sotto, perché
// nessuno spende esattamente la cifra pensata; sopra, un margine del 20%.
export function fasciaDaBudget(budget) {
  const b = Number(String(budget).replace(/[^\d]/g, ""));
  if (!b || b <= 0) return { min: "", max: "" };
  return { min: Math.max(0, Math.round(b * 0.35)), max: Math.round(b * 1.2) };
}

// Mette insieme le parole che descrivono il capo. L'ordine conta poco per
// Google, ma la precisione sì: "blu notte" trova più cose di "blu".
export function descriviCapo({ capo = "", colore = "", taglia = "", materiale = "" } = {}) {
  return [capo.trim(), colore.trim(), materiale.trim(), taglia.trim() && `taglia ${taglia.trim()}`]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
}

// Ricerca su Google Shopping, con fascia di prezzo applicata.
export function urlShopping({ capo, colore, taglia, materiale, min, max } = {}) {
  const q = descriviCapo({ capo, colore, taglia, materiale });
  if (!q) return null;

  const tbs = ["mr:1"];
  if (min !== "" && min != null) tbs.push(`price:1`, `ppr_min:${Math.round(Number(min))}`);
  if (max !== "" && max != null) {
    if (!tbs.includes("price:1")) tbs.push("price:1");
    tbs.push(`ppr_max:${Math.round(Number(max))}`);
  }

  const p = new URLSearchParams({ q, tbm: "shop", hl: "it", gl: "IT" });
  if (tbs.length > 1) p.set("tbs", tbs.join(","));
  return `https://www.google.com/search?${p.toString()}`;
}

// Ricerca ristretta ai soli negozi scelti: niente Shein, niente Temu,
// niente marketplace a caso. È qui che l'app tiene la sua promessa.
export function urlNeiNegozi({ capo, colore, taglia, materiale, negozi = [] } = {}) {
  const q = descriviCapo({ capo, colore, taglia, materiale });
  if (!q || !negozi.length) return null;
  const siti = negozi.map((d) => `site:${d}`).join(" OR ");
  const p = new URLSearchParams({ q: `${q} (${siti})`, hl: "it", gl: "IT" });
  return `https://www.google.com/search?${p.toString()}`;
}

// Link diretto alla ricerca interna di un singolo negozio, quando esiste:
// più preciso di Google, perché è il negozio a cercare nel proprio catalogo.
export function negoziPerFascia({ escludiFast = false, fascia = null } = {}) {
  return NEGOZI.filter((n) => (escludiFast ? !n.fast : true)).filter((n) =>
    fascia ? n.fascia === fascia || n.fascia === "second-hand" : true,
  );
}
