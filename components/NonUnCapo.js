// Quando nella foto non c'è un capo.
//
// Dirlo è meglio che indovinare: un iPhone descritto come "pantalone in
// cotone, 18–25 €" non è un errore innocuo, è una persona che pubblica un
// annuncio per una cosa che non ha.
export default function NonUnCapo({ esito }) {
  if (!esito || esito.riconosciuto !== false) return null;

  return (
    <div className="card" style={{ padding: "clamp(18px,3vw,26px)", display: "grid", gap: 8 }}>
      <p className="eyebrow" style={{ margin: 0 }}>Qui non vedo un capo</p>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>
        {esito.oggetto
          ? <>Nella foto mi sembra di vedere <strong>{esito.oggetto}</strong>, non un capo da indossare.</>
          : <>Nella foto non riesco a riconoscere un capo da indossare.</>}
      </p>
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
        Riprova con la foto di un vestito, di un paio di scarpe o di un accessorio — meglio se
        disteso o appeso, con luce buona e poco sfondo intorno.
      </p>
    </div>
  );
}
