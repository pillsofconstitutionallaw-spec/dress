"use client";

// La foto che passa da "Abbina" a "Vendi".
//
// Le due pagine sono separate apposta, ma far ricaricare la stessa immagine
// due volte sarebbe una separazione pagata dall'utente. Viaggia in
// sessionStorage: è un data URL da centinaia di kB e non ha nessun motivo di
// sopravvivere alla chiusura della scheda, quindi non in localStorage.
const CHIAVE = "dress:capo";

export function lasciaCapo(dataUrl) {
  try {
    sessionStorage.setItem(CHIAVE, dataUrl);
  } catch {
    /* memoria piena o disabilitata: si ricarica la foto a mano, pazienza */
  }
}

export function raccogliCapo() {
  try {
    const foto = sessionStorage.getItem(CHIAVE);
    // Si legge una volta sola: se torni su /vendi domani, la foto di ieri non
    // deve ricomparire come se l'avessi appena scelta.
    sessionStorage.removeItem(CHIAVE);
    return foto || null;
  } catch {
    return null;
  }
}
