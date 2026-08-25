// Un gruppo di sezioni, con un nome sopra.
//
// La dashboard aveva sette sezioni tutte uguali: stesso titolo, stessa
// distanza, stesso peso. Niente diceva cosa guardare per primo, e "I tuoi
// preferiti", "Capi salvati" e "Negozi preferiti" sembravano tre nomi per la
// stessa cosa perché erano scritti nello stesso modo, uno sotto l'altro.
//
// Questo non aggiunge decorazione: aggiunge un livello. Sopra il nome del
// gruppo, in piccolo e staccato da una riga; sotto, le sezioni che gli
// appartengono, più vicine fra loro di quanto lo siano ai gruppi vicini.
// È la distanza a dire cosa sta con cosa, prima ancora delle parole.
export default function Gruppo({ titolo, detta = null, children }) {
  return (
    <section style={{ marginTop: 46 }}>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginBottom: 22 }}>
        <p className="eyebrow" style={{ margin: 0 }}>{titolo}</p>
        {detta ? (
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 13, maxWidth: "52ch" }}>{detta}</p>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: 30 }}>{children}</div>
    </section>
  );
}
