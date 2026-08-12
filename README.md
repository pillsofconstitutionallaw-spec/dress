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
   - (opzionale) `GEMINI_MODEL` = `gemini-1.5-pro` (o il modello disponibile nel tuo account)
   - se il valore inizia con `models/`, va comunque bene: il codice rimuove automaticamente il prefisso.
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

## 4. Account, mail di conferma e cancellazione (opzionale)

Senza le variabili Supabase l'app funziona lo stesso: palette, preferiti e capi salvati restano
nel browser. Attivando gli account, invece, l'utente ritrova i suoi dati ovunque.

### 4.1 Crea il progetto

1. Su https://supabase.com crea un progetto (piano gratuito).
2. **Settings → API**: copia `Project URL`, `anon public` e `service_role`.
3. Metti in `.env.local` (e su Vercel) le variabili elencate in `.env.example`:
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
   La `service_role` è segreta: serve solo al server per cancellare un account.
4. **SQL Editor → New query**: incolla ed esegui `sql/supabase_init.sql`.
   Crea la tabella `profiles`, attiva le regole RLS e collega ogni profilo al suo utente.

### 4.2 La mail di conferma

L'iscrizione **non attiva subito** l'account: Supabase manda una mail con un link, e finché non
viene aperto l'utente non può salvare nulla (`EMAIL_NOT_CONFIRMED`). Il link riporta su
`/auth/confirmed`.

- In **Authentication → Providers → Email** deve restare acceso *Confirm email*.
- In **Authentication → URL Configuration** metti il **Site URL** del tuo dominio e aggiungi
  `https://tuo-dominio/auth/confirmed` tra i *Redirect URLs* (in locale: `http://localhost:3000/auth/confirmed`).
- Il mittente predefinito è `noreply@mail.app.supabase.io`: è già un vero no-reply, ma **col
  mittente di default sul piano Free non si può cambiare nulla**. Verificato sul campo:
  - il limite è **2 mail all'ora** e l'API rifiuta di alzarlo
    (*"Custom SMTP required to configure RATE_LIMIT_EMAIL_SENT"*);
  - i testi restano in inglese e l'API rifiuta di personalizzarli
    (*"Email template modification is not available for free tier projects using the default email provider"*).

  Per le prove va benissimo così. Per sbloccare limiti, lingua e mittente serve un **SMTP tuo**
  (permesso anche sul piano Free) in **Project Settings → Authentication → SMTP Settings**:
  - **con un dominio tuo** → Resend o Postmark, mittente `noreply@tuodominio.it`: è l'unico modo di
    avere un no-reply davvero non replicabile, perché un indirizzo esiste solo su un dominio che
    controlli. Servono 3 record DNS;
  - **senza dominio** → Brevo con un singolo indirizzo verificato (anche una Gmail): sblocca lingua e
    volumi, ma il mittente sarà quell'indirizzo, quindi le risposte arrivano davvero a te.

  Una volta collegato l'SMTP, i testi si cambiano in **Authentication → Email Templates**.
- Chi non riceve la mail può farsela rimandare: pulsante "Rimanda la mail" (`/api/auth/resend`).

### 4.3 Cancellare l'account

Dal proprio spazio (`/dashboard` → **Elimina account**) l'utente riscrive la sua email per conferma:
spariscono le credenziali e, per effetto del vincolo `on delete cascade`, anche palette, preferiti e
outfit salvati. Serve `SUPABASE_SERVICE_ROLE_KEY`, altrimenti l'app cancella i dati del profilo ma
avvisa che le credenziali restano.

### 4.4 Come è protetto

Ogni API che tocca dati personali (`/api/profile/*`, `/api/favorites/*`, `/api/outfits/*`,
`/api/account/delete`) identifica l'utente **dal token di sessione** mandato nell'header
`Authorization: Bearer …`, mai da un'email nel corpo della richiesta. Le query girano a nome
dell'utente, quindi anche il database (RLS) impedisce di leggere le righe altrui.

## 5. Come sono gestiti i "negozi"

Non esiste un'API pubblica di Zara/Vinted. L'app quindi **non si collega** ai negozi: genera
**link diretti alla ricerca** sui loro siti (deep-link) — nessun costo, sempre aggiornato.
I retailer e i flag "fast fashion" sono in `lib/data.js` (`RETAILERS`, `WEEKLY_OFFERS`, `COLORS_OF_YEAR`):
modificali a piacere. In futuro, per monetizzare, si sostituiscono i link con quelli di
affiliazione (Awin, Rakuten, Skimlinks…).

## 6. Nota su privacy e produzione (importante)

Il tier gratuito di Gemini **non ha SLA** e i prompt possono essere usati per il miglioramento del
modello. Va bene per demo/prototipo. Quando gestirai selfie di **utenti reali** (dati personali/biometrici):

- passa a Gemini **a pagamento** con opt-out dal training, o a un provider EU (es. Mistral) per il GDPR;
- **non conservare** le foto: qui vengono ridotte lato client e inviate solo per l'analisi, non salvate;
- aggiungi una **privacy policy** che spieghi come tratti le immagini e ottieni il consenso;
- la cancellazione dell'account (§4.3) copre il "diritto all'oblio": tienila raggiungibile e funzionante.

## Struttura

```
app/
  page.js            Landing
  start/             Flusso: iscrizione → dati → foto → palette → outfit
  dashboard/         Spazio personale: accesso, salvataggi, elimina account
  auth/confirmed/    Atterraggio del link nella mail di conferma
  colors/            Colori dell'anno
  offers/            Offerte della settimana
  wardrobe/          Abbina / rivendi un capo
  api/analyze/       Selfie → palette (Gemini o demo)
  api/resell/        Capo → scheda di rivendita (Gemini o demo)
  api/auth/          register (manda la mail), login, resend
  api/account/       delete: cancellazione definitiva dell'account
  api/profile/       get, save (palette e nome)
  api/favorites/     toggle dei negozi preferiti
  api/outfits/       add, remove degli outfit salvati
lib/
  data.js            Nome brand, stili, retailer, colori, offerte
  gemini.js          Trasporto verso Gemini (solo server)
  fallback.js        Dati di esempio (modalità demo)
  img.js             Ridimensiona le foto lato client
  session.js         Sessione lato browser + chiamate API autenticate
  supabaseClient.js  Client Supabase lato server (anon, service, per-utente)
  supabaseBrowser.js Client Supabase lato browser
  authServer.js      Verifica il token e identifica chi chiama le API
  authMessages.js    Errori di autenticazione tradotti in italiano
  profileStore.js    Utility condivise per preferiti e outfit
  ai/
    index.js         Sceglie il provider (AI_PROVIDER) + fallback
    prompts.js       I prompt, separati per compito
    gemini.js        Provider Gemini
    demo.js          Provider demo
```
