# Dress — app di stile personale (prototipo)

App Next.js che, da un selfie e pochi dati, genera una **palette personale di 5 colori** e **outfit**
con indicazione di **dove comprarli** (con segnalazione del fast fashion) e una sezione per
**abbinare o rivendere** i capi che hai già (descrizione + prezzo + link Vinted).

> Il nome si cambia in **una sola riga** in `lib/data.js` (`export const BRAND = "..."`).

## Funziona subito, anche senza AI

L'app gira in **modalità demo** senza alcuna chiave: le API restituiscono risultati di esempio,
così puoi fare il deploy e la presentazione **a costo zero**. Quando vuoi l'analisi reale dalla foto,
aggiungi la chiave Gemini (vedi sotto).

## 1. Provalo in locale

Serve Node.js 18+.

```bash
npm install
npm run dev
```

Apri http://localhost:3000

## 2. Deploy su Vercel

1. Metti il progetto su GitHub (o usa la CLI `vercel`).
2. Su https://vercel.com → **New Project** → importa il repo.
3. Framework preset: **Next.js** (rilevato in automatico). Premi **Deploy**.

Fatto: l'app è online in modalità demo.

## 3. Attivare l'AI (Gemini) — gratis

L'analisi delle immagini usa **Google Gemini**, che ha un tier gratuito senza carta di credito.

1. Vai su https://aistudio.google.com/apikey e crea una **API key**.
2. Su Vercel → **Settings → Environment Variables**, aggiungi:
   - `GEMINI_API_KEY` = la tua chiave
   - (opzionale) `GEMINI_MODEL` = `gemini-2.5-flash`
3. **Redeploy** il progetto.

In locale, crea un file `.env.local` (vedi `.env.example`) con le stesse variabili.

La chiave resta **solo lato server** (nelle API route `/api/analyze` e `/api/resell`) e non viene
mai esposta nel browser.

## 3-bis. Cambiare motore AI (senza toccare il resto)

La logica AI è dietro un livello unico e intercambiabile (`lib/ai/`). Ogni provider
(`demo`, `gemini`) espone le stesse funzioni (`analyzeColor`, `resell`) e ogni compito ha il suo
prompt separato (`lib/ai/prompts.js`). Per scegliere il motore imposti la variabile `AI_PROVIDER`
(`demo` | `gemini`, vuoto = automatico). Per aggiungerne uno nuovo (Mistral, OpenAI, un tuo modello)
basta creare `lib/ai/nome.js` con le stesse due funzioni e registrarlo in `lib/ai/index.js`.
Nessuna modifica alla UI o alle API route.

## 4. Come sono gestiti i "negozi"

Non esiste un'API pubblica di Zara/Vinted. L'app quindi **non si collega** ai negozi: genera
**link diretti alla ricerca** sui loro siti (deep-link) — nessun costo, sempre aggiornato.
I retailer e i flag "fast fashion" sono in `lib/data.js` (`RETAILERS`, `WEEKLY_OFFERS`, `COLORS_OF_YEAR`):
modificali a piacere. In futuro, per monetizzare, si sostituiscono i link con quelli di
affiliazione (Awin, Rakuten, Skimlinks…).

## 5. Nota su privacy e produzione (importante)

Il tier gratuito di Gemini **non ha SLA** e i prompt possono essere usati per il miglioramento del
modello. Va bene per demo/prototipo. Quando gestirai selfie di **utenti reali** (dati personali/biometrici):

- passa a Gemini **a pagamento** con opt-out dal training, o a un provider EU (es. Mistral) per il GDPR;
- **non conservare** le foto: qui vengono ridotte lato client e inviate solo per l'analisi, non salvate;
- aggiungi una **privacy policy** che spieghi come tratti le immagini e ottieni il consenso.

## Struttura

```
app/
  page.js            Landing
  start/             Flusso: dati → foto → palette → outfit
  colors/            Colori dell'anno
  offers/            Offerte della settimana
  wardrobe/          Abbina / rivendi un capo
  api/analyze/       Selfie → palette (Gemini o demo)
  api/resell/        Capo → scheda di rivendita (Gemini o demo)
lib/
  data.js            Nome brand, stili, retailer, colori, offerte
  gemini.js          Trasporto verso Gemini (solo server)
  fallback.js        Dati di esempio (modalità demo)
  img.js             Ridimensiona le foto lato client
  ai/
    index.js         Sceglie il provider (AI_PROVIDER) + fallback
    prompts.js       I prompt, separati per compito
    gemini.js        Provider Gemini
    demo.js          Provider demo
```
