import Link from "next/link";
import { BRAND } from "@/lib/data";

export const metadata = {
  title: `Privacy — ${BRAND}`,
  description: "Che dati raccogliamo, perché, per quanto, e come cancellarli.",
};

// Questa pagina descrive quello che il codice fa davvero. Se cambia il codice,
// va cambiata anche questa: una policy che non corrisponde è peggio di nessuna.
export default function Privacy() {
  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 680 }}>
      <p className="eyebrow">{BRAND}</p>
      <h1 className="h2">Privacy</h1>
      <p className="muted">
        In breve: chiediamo poche cose, le foto non le conserviamo, e puoi cancellare tutto da solo
        in qualsiasi momento. Sotto c’è il dettaglio.
      </p>

      <section style={{ marginTop: 40 }}>
        <h2 className="h3">Chi tratta i tuoi dati</h2>
        <p>
          Il titolare del trattamento è <strong>[NOME E COGNOME O RAGIONE SOCIALE]</strong>,
          <strong> [INDIRIZZO]</strong>. Per qualunque cosa riguardi i tuoi dati scrivi a{" "}
          <a href="mailto:info@dressapp.it"><strong>info@dressapp.it</strong></a>: è una casella
          letta da una persona, non un no-reply.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="h3">Cosa raccogliamo, e perché</h2>

        <h3 className="h4" style={{ marginTop: 20 }}>Per avere un account</h3>
        <p>
          Nome, indirizzo email e password. La password non la vediamo né la conserviamo: la gestisce
          Supabase, che ne custodisce solo un’impronta cifrata. L’email serve a farti entrare e a
          mandarti il link di conferma. Base giuridica: l’esecuzione del servizio che ci hai chiesto.
        </p>

        <h3 className="h4" style={{ marginTop: 20 }}>Per l’analisi dei colori</h3>
        <p>
          Altezza, colore di capelli e occhi, stile preferito, budget indicativo e le fotografie che
          carichi. Servono a calcolare la tua palette. Base giuridica: il tuo consenso, che dai
          caricando le foto e che puoi ritirare quando vuoi.
        </p>

        <h3 className="h4" style={{ marginTop: 20 }}>Quello che salvi</h3>
        <p>
          La palette, i negozi che segni come preferiti e gli outfit che metti da parte, così li
          ritrovi da qualsiasi dispositivo.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="h3">Le fotografie</h2>
        <p>
          È il punto che conta di più, quindi lo diciamo per esteso.
        </p>
        <ul style={{ lineHeight: 1.8, paddingLeft: "1.2em" }}>
          <li>Le foto vengono <strong>rimpicciolite sul tuo dispositivo</strong> prima di partire.</li>
          <li>Vengono inviate al servizio di analisi solo per il tempo del calcolo.</li>
          <li><strong>Non le salviamo</strong>: non finiscono nel nostro database né in un archivio.</li>
          <li>Quello che resta è il risultato — i cinque colori — non l’immagine.</li>
        </ul>
        <p>
          Un’avvertenza onesta: una fotografia del viso è un dato personale delicato. Se preferisci
          non caricarla, puoi compilare i dati a mano e ottenere comunque una palette, meno precisa.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="h3">Chi altro li vede</h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: "1.2em" }}>
          <li><strong>Supabase</strong> — account e dati salvati. Server nell’Unione Europea (Parigi).</li>
          <li><strong>Vercel</strong> — il sito e le sue pagine.</li>
          <li><strong>Register.it</strong> — l’invio delle email di conferma.</li>
          <li>
            <strong>Il servizio di analisi delle immagini</strong> — riceve le foto per il solo tempo
            del calcolo, quando l’analisi automatica è attiva.
          </li>
        </ul>
        <p>
          Non vendiamo i tuoi dati e non li cediamo a inserzionisti. I link ai negozi sono normali
          collegamenti: quando li apri, esci da qui ed entri nel loro sito, con le loro regole.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="h3">Per quanto tempo</h2>
        <p>
          Finché tieni l’account. Quando lo cancelli, spariscono insieme profilo, palette, preferiti
          e outfit salvati — non restano copie in attesa.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="h3">Cosa resta sul tuo dispositivo</h2>
        <p>
          Se non ti registri, l’app tiene le tue scelte solo nel browser (nella memoria locale del
          sito), e da lì non escono. Non usiamo cookie di profilazione né strumenti pubblicitari.
          Cancellando i dati del sito dal browser, cancelli anche quelli.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="h3">I tuoi diritti</h2>
        <p>
          Puoi chiedere di vedere i tuoi dati, correggerli, cancellarli, riceverne una copia, o
          opporti al trattamento. La cancellazione puoi farla da solo, subito: la trovi nel tuo
          spazio personale, alla voce <strong>Elimina account</strong>.
        </p>
        <p>
          Per tutto il resto scrivi a <a href="mailto:info@dressapp.it"><strong>info@dressapp.it</strong></a>. Se pensi che qualcosa non
          sia stato fatto correttamente, puoi rivolgerti al Garante per la protezione dei dati
          personali (<span className="muted">garanteprivacy.it</span>).
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="h3">Se cambia qualcosa</h2>
        <p>
          Se cambieremo il modo in cui trattiamo i dati, aggiorneremo questa pagina e te lo diremo
          prima, non dopo.
        </p>
      </section>

      <p className="muted" style={{ marginTop: 48, fontSize: 13, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        Questo testo descrive fedelmente quello che l’applicazione fa oggi. Non è un parere legale:
        prima di aprire a utenti veri, falla leggere a chi di dovere e completa le parti fra parentesi
        quadre.
      </p>

      <p style={{ marginTop: 28 }}>
        <Link href="/" className="btn ghost">Torna alla home</Link>
      </p>
    </div>
  );
}
