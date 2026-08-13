// Regole della password, in un posto solo: le usano sia il browser (per
// dirtelo mentre scrivi) sia il server (per non fidarsi del browser).

export const LUNGHEZZA_MINIMA = 10;

export function controllaPassword(password = "") {
  const p = String(password);
  const problemi = [];

  if (p.length < LUNGHEZZA_MINIMA) problemi.push(`almeno ${LUNGHEZZA_MINIMA} caratteri`);
  if (!/[a-zà-ù]/.test(p)) problemi.push("una lettera minuscola");
  if (!/[A-ZÀ-Ù]/.test(p)) problemi.push("una lettera maiuscola");
  if (!/\d/.test(p)) problemi.push("un numero");

  // Le più usate al mondo. Il confronto è sul NOCCIOLO della password —
  // cioè su cosa resta togliendo cifre e simboli — perché "Password123!" è
  // banale davvero, mentre "MiaPassword1!" no: la prima è quella parola con
  // un contorno, la seconda è una password che quella parola la contiene.
  const banali = ["password", "qwerty", "juventus", "napoli", "amoremio", "dressapp", "abcdef", "iloveyou"];
  const nocciolo = p.toLowerCase().replace(/[^a-zà-ù]/g, "");
  const soloCifre = p.replace(/\D/g, "");
  if (banali.includes(nocciolo) || /^(\d)\1+$/.test(soloCifre) && soloCifre.length === p.length) {
    return { ok: false, forza: 0, messaggio: "Questa password è fra le più usate al mondo: cambiala." };
  }
  if (/^(012345|123456|654321|111111|000000)/.test(p)) {
    return { ok: false, forza: 0, messaggio: "Questa password è fra le più usate al mondo: cambiala." };
  }

  const forza = Math.min(4, [p.length >= LUNGHEZZA_MINIMA, /[a-z]/.test(p), /[A-Z]/.test(p), /\d/.test(p), /[^\w\s]/.test(p), p.length >= 14]
    .filter(Boolean).length - 1);

  return {
    ok: problemi.length === 0,
    forza: Math.max(0, forza),
    messaggio: problemi.length ? `Manca ancora: ${problemi.join(", ")}.` : "Password solida.",
  };
}

export function controllaUsername(username = "") {
  const u = String(username).trim();
  if (u.length < 3) return { ok: false, messaggio: "Almeno 3 caratteri." };
  if (u.length > 20) return { ok: false, messaggio: "Massimo 20 caratteri." };
  if (!/^[a-z0-9._]+$/i.test(u)) return { ok: false, messaggio: "Solo lettere, numeri, punto e trattino basso." };
  return { ok: true, messaggio: "" };
}

// Maggiore età: senza, non possiamo trattare i dati come facciamo.
export function controllaDataNascita(data = "") {
  if (!data) return { ok: false, messaggio: "Serve la data di nascita." };
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return { ok: false, messaggio: "Data non valida." };

  const oggi = new Date();
  let anni = oggi.getFullYear() - d.getFullYear();
  const m = oggi.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && oggi.getDate() < d.getDate())) anni--;

  if (anni < 14) return { ok: false, messaggio: "Serve avere almeno 14 anni per iscriversi." };
  if (anni > 120) return { ok: false, messaggio: "Controlla la data." };
  return { ok: true, anni, messaggio: "" };
}
