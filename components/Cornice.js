"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

// Decide che aspetto ha lo schermo intorno al contenuto.
//
// Dress è un'app, non un sito: dentro non ci sono barre di navigazione con
// link né piè di pagina, ma tre comandi in basso, dove arriva il pollice.
// Le uniche due pagine che restano "sito" sono la vetrina e la privacy,
// perché quelle si aprono da un link e vanno lette.

const PAGINE_SITO = ["/scopri", "/privacy"];
const SENZA_CORNICE = ["/", "/auth/confirmed"];

const VOCI = [
  {
    // "Stile" portava al questionario, cioè a rifare una cosa già fatta.
    // Adesso porta al suo risultato: i colori e gli stili. Chi l'analisi non
    // l'ha ancora fatta trova lì il tasto per farla.
    href: "/tuo-stile",
    label: "Stile",
    icona: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
      </>
    ),
  },
  {
    href: "/outfit",
    label: "Completi",
    icona: (
      <>
        <path d="M6 3l6 3 6-3 2 6-3 1v11H7V10L4 9z" />
      </>
    ),
  },
  {
    href: "/cerca",
    label: "Cerca",
    icona: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  {
    href: "/dashboard",
    label: "Guardaroba",
    icona: (
      <>
        <path d="M4 9h16v11H4z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
  },
  {
    href: "/vendi",
    label: "Vendi",
    icona: (
      <>
        <path d="M4.5 12.5 12 5h7v7l-7.5 7.5a1.6 1.6 0 0 1-2.3 0l-4.7-4.7a1.6 1.6 0 0 1 0-2.3z" />
        <circle cx="15.5" cy="8.5" r="1.1" />
      </>
    ),
  },
  {
    // Il profilo stava dentro Impostazioni, sotto la rotella, in mezzo alla
    // password e alla cancellazione dell'account. Ma la propria faccia, le
    // proprie foto e i dati da cui esce la palette non sono impostazioni:
    // sono le cose che si guardano, e vanno dove si guarda.
    href: "/profilo",
    label: "Profilo",
    icona: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="0.5" />
        <circle cx="12" cy="10" r="2.6" />
        <path d="M7.2 18.4c.6-2.3 2.5-3.6 4.8-3.6s4.2 1.3 4.8 3.6" />
      </>
    ),
  },
];

export default function Cornice({ children }) {
  const percorso = usePathname() || "/";

  if (SENZA_CORNICE.includes(percorso)) {
    return <main style={{ minHeight: "100dvh" }}>{children}</main>;
  }

  if (PAGINE_SITO.includes(percorso)) {
    return (
      <>
        <header style={{ borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--paper)", zIndex: 20 }}>
          <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 66 }}>
            <Link href="/scopri" style={{ display: "inline-flex", alignItems: "center" }}>
              <BrandMark small />
            </Link>
            <Link href="/" className="btn">Entra</Link>
          </div>
        </header>
        <main>{children}</main>
        <footer style={{ borderTop: "1px solid var(--line)", marginTop: 96 }}>
          <div className="wrap" style={{ padding: "40px var(--pad)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <span className="eyebrow">Dress</span>
            <span className="muted" style={{ fontSize: 13, display: "flex", gap: 16 }}>
              <Link href="/privacy">Privacy</Link>
              <span>Moda che ti somiglia.</span>
            </span>
          </div>
        </footer>
      </>
    );
  }

  // Dentro l'app: contenuto a schermo pieno, la rotella in alto e la barra
  // in basso.
  return (
    <>
      {/* La rotella sta qui e non dentro una pagina.
          Prima stava solo sulla home: da "Completi", da "Cerca" o da "Stile"
          non c'era in nessun punto dello schermo, e per cambiare la password
          bisognava prima sapere che le impostazioni erano in casa. Un comando
          che si cerca da qualunque parte va messo in un posto che c'è da
          qualunque parte. */}
      {percorso !== "/impostazioni" ? (
        <Link
          href="/impostazioni"
          aria-label="Impostazioni"
          title="Impostazioni"
          style={{
            position: "fixed",
            top: "calc(10px + env(safe-area-inset-top))",
            right: 12,
            zIndex: 25,
            display: "grid",
            placeItems: "center",
            width: 38,
            height: 38,
            background: "var(--paper)",
            border: "1px solid var(--line)",
            color: "var(--greige)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      ) : null}

      <main style={{ minHeight: "100dvh", paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}>
        {children}
      </main>

      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          background: "var(--paper)",
          borderTop: "1px solid var(--line)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Le colonne le conta l'elenco: erano fissate a quattro, e la quinta
            voce sarebbe finita fuori dalla griglia. */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${VOCI.length}, 1fr)`, maxWidth: 560, margin: "0 auto" }}>
          {VOCI.map((v) => {
            const attiva = percorso.startsWith(v.href);
            return (
              <Link
                key={v.href}
                href={v.href}
                aria-current={attiva ? "page" : undefined}
                style={{
                  display: "grid",
                  justifyItems: "center",
                  gap: 4,
                  padding: "10px 0 12px",
                  color: attiva ? "var(--ink)" : "var(--greige)",
                  textDecoration: "none",
                }}
              >
                <svg
                  width={VOCI.length > 5 ? 21 : 23}
                  height={VOCI.length > 5 ? 21 : 23}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={attiva ? 1.9 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {v.icona}
                </svg>
                {/* Con sei voci "Guardaroba" non ci sta più: il carattere lo
                    decide il numero di colonne, invece di traboccare fuori
                    dallo schermo su un telefono stretto. */}
                <span style={{ fontSize: VOCI.length > 5 ? 9.5 : 11, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{v.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
