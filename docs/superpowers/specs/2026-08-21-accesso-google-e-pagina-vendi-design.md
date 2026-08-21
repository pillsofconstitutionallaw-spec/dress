# Accesso con Google, accesso riparato, pagina Vendi separata

Data: 2026-08-21
Progetto: Dress (`filo`)

## Perché

Tre cose, decise insieme perché toccano gli stessi file.

1. **Ci si deve poter iscrivere con Gmail.** Oggi c'è solo email + password.
2. **L'accesso a volte non funziona.** Indagato: la causa principale è certa, una
   seconda è probabile e ha bisogno di una osservazione dal vivo.
3. **Abbinare un capo e venderlo sono due gesti diversi** che oggi stanno nella
   stessa pagina e nella stessa chiamata all'AI. Vanno separati, con un tasto
   «Vendi» nella barra in basso.

Apple / «Accedi con iCloud» è **fuori**: sul web richiede un Apple Developer
Program a 99 €/anno che non c'è. Niente flag, niente codice spento, niente
predisposizione: il giorno che servirà si aggiungerà allora.

---

## Parte 1 — Perché l'accesso fallisce

### 1.1 Causa certa: il nome utente non può funzionare

Il campo invita a scrivere «Email o nome utente»
([`SchermataAccesso.js:153`](../../../components/SchermataAccesso.js)), ma sotto
c'è `signInWithPassword({ email })`
([`session.js:104`](../../../lib/session.js)), che accetta **solo** un indirizzo
email. Nel codice non esiste nessuna traduzione da nome utente a email.

Chi digita il proprio nome utente riceve «Email o password non corretti» pur
avendo scritto la password giusta. Con l'email funziona. Da fuori sembra un
guasto intermittente; è deterministico.

**Aggravante.** [`session.js:107-111`](../../../lib/session.js) schiaccia ogni
errore che non sia «email non confermata» sulla stessa frase. Anche il blocco
per troppi tentativi diventa «password non corretti», così l'utente riprova e
peggiora il blocco. La traduzione corretta esiste già in
[`authMessages.js:12-20`](../../../lib/authMessages.js) ma vive dentro
`/api/auth/login`, **che nessuno chiama**: è codice morto, verificato con
`grep` su tutto il progetto.

### 1.2 Causa probabile: flusso «implicit» contro codice scritto per PKCE

`flowType` non è impostato in [`supabaseBrowser.js`](../../../lib/supabaseBrowser.js);
il default di `@supabase/auth-js` 2.112.3 è `'implicit'` (`GoTrueClient.js:24`).
Ma [`confirmed/page.js:56-63`](../../../app/auth/confirmed/page.js) e
[`reimposta/page.js:37-44`](../../../app/auth/reimposta/page.js) leggono `?code=`
e chiamano `exchangeCodeForSession`, cioè PKCE.

Se Supabase rimanda con `?code=`:

- `_isPKCECallback` (riga 3345) pretende un *code verifier* salvato, che un
  client implicit non ha mai creato → `false`;
- `_isImplicitGrantCallback` (riga 3336) cerca `#access_token` → `false`;
- quindi `detectSessionInUrl` **non fa nulla e non segnala nulla**;
- lo scambio manuale fallisce dentro un `catch` vuoto;
- la pagina conclude che non c'è sessione.

Da qui «Ora puoi accedere con la tua email e password» mostrato a chi era appena
entrato, e «Il link non è più valido» sul recupero password.

**Ipotesi esclusa.** Non c'è corsa fra `detectSessionInUrl` e `getSession()`:
`getSession()` attende `initializePromise` (riga 2402). Verificato nel sorgente.

**Osservazione mancante.** Per confermare la diagnosi serve sapere se l'URL di
atterraggio contiene `?code=…` o `#access_token=…`.

La correzione però **non aspetta quella risposta**, e soprattutto non deve
scommettere su una delle due: deve reggerle entrambe.

`flowType` viene **dichiarato `'implicit'`** — che è già il valore di fatto, ma
scritto invece che subito. Non è una resa al default: PKCE conserva il
*verificatore* nel browser che ha **chiesto** il link, quindi obbligherebbe ad
aprire la mail sullo stesso dispositivo da cui ci si è iscritti. Chi si iscrive
dal computer e legge la posta dal telefono non entrerebbe più: sarebbe barattare
un guasto con un altro.

Le due pagine di atterraggio invece **reggono tutti e due i formati** —
`#access_token` letto in automatico, `?code=` scambiato a mano — e in nessun
caso ingoiano più l'errore. È questo che chiude il guasto: non indovinare quale
sia il formato giusto, ma smettere di fallire in silenzio quando non è quello
atteso. L'osservazione dal vivo resta utile per sapere quanti utenti ne siano
stati colpiti finora.

### 1.3 Le correzioni

**a) Login con nome utente, senza esporre le email.**

`/api/auth/login` viene richiamata in servizio invece di aggiungere una route
nuova. Accetta `{ identificativo, password }`:

- se `identificativo` contiene `@`, è l'email;
- altrimenti risolve il nome utente in email **lato server**, con
  `getSupabaseService()`, e non restituisce mai l'email al browser;
- esegue `signInWithPassword` e restituisce la sessione;
- il browser la installa con `sb.auth.setSession({ access_token, refresh_token })`.

L'email non viaggia mai verso il browser, quindi la route non diventa un modo
per scoprire l'indirizzo di un iscritto partendo dal suo nome utente. La
risposta d'errore è **identica** per «nome utente inesistente» e «password
sbagliata», e con lo stesso codice di stato: altrimenti la differenza fra le due
risposte direbbe comunque chi è iscritto.

`lib/session.js#signIn` passa da qui e smette di parlare direttamente con
Supabase per il login.

**b) Messaggi d'errore veri.** La risposta della route usa `translateAuthError`,
già scritto e già collaudato. «Troppi tentativi ravvicinati» torna a dire quello
che è. Va corretta anche la riga sbagliata in
[`authMessages.js:16`](../../../lib/authMessages.js), che promette «almeno 8
caratteri» mentre `LUNGHEZZA_MINIMA` è 10.

**c) Un flusso dichiarato, e pagine che reggono entrambi.** `flowType:
'implicit'` esplicito in `supabaseBrowser.js`, per le ragioni al punto 1.2. Le
due pagine di atterraggio gestiscono sia `#access_token` sia `?code=`, e
smettono di ingoiare l'errore: se lo scambio fallisce, il motivo si vede a
schermo.

---

## Parte 2 — Accesso con Google

### 2.1 Il giro

```
[Continua con Google]
        │  signInWithOAuth({ provider: 'google', redirectTo: /auth/callback })
        ▼
   Google chiede il consenso
        │
        ▼
   /auth/callback   ← nuova pagina
        │  la sessione la raccoglie il client (detectSessionInUrl)
        │
        ├── profilo completo ──► /dashboard  (o /start se manca la palette)
        └── profilo incompleto ─► /auth/completa
```

`lib/session.js` guadagna `entraCon('google')`. Nessun elenco di provider,
nessun flag: una funzione, un provider.

La regola «dove mando l'utente» è la stessa già scritta in
[`SchermataAccesso.js:37-45`](../../../components/SchermataAccesso.js) e
duplicata in [`confirmed/page.js:13-21`](../../../app/auth/confirmed/page.js).
Diventerebbe la terza copia: la estraggo in `lib/prossimaTappa.js` e le tre
pagine la importano.

### 2.2 Perché serve «completa il profilo»

Google restituisce email, nome e foto. Il server pretende anche **nome utente** e
**data di nascita**, con la soglia dei 14 anni
([`password.js:58`](../../../lib/password.js)). Senza un passaggio in più si
creerebbero account senza username e senza età dichiarata.

`/auth/completa` chiede **solo quello che manca**: nome utente e data di
nascita. Nome e cognome arrivano precompilati da Google e restano correggibili;
l'avatar è la foto Google, sostituibile. Nessun campo password: un account
Google non ne ha una.

La pagina non ha «Indietro». Chi ci arriva ha una sessione valida ma un profilo
a metà, e l'unica uscita in avanti è completarlo. (Non metto un blocco su tutte
le pagine dell'app: sarebbe un middleware su ogni richiesta per un caso che si
verifica una volta per utente. Chi aggira `/auth/completa` scrivendo un altro
indirizzo a mano trova un profilo senza username, non un danno.)

### 2.3 Il server ricontrolla

`POST /api/profile/completa` riusa `requireUser`
([`authServer.js:18`](../../../lib/authServer.js)) e le stesse
`controllaUsername` / `controllaDataNascita` del modulo classico. Di quello che
arriva dalla rete non ci si fida nemmeno quando arriva da Google.

`requireUser` pretende l'email confermata: gli account Google arrivano da
Supabase già confermati, quindi passano.

### 2.4 La migrazione del database (difetto preesistente)

[`supabase_init.sql:14-23`](../../../sql/supabase_init.sql) crea `profiles` con
`id, email, name, palette, favorites, saved_outfits`. Mancano `username`,
`cognome`, `data_nascita`, `avatar`. Ma
[`register/route.js:43-51`](../../../app/api/auth/register/route.js) cerca
l'username lì dentro e [le righe 77-87](../../../app/api/auth/register/route.js)
ci scrivono tutti e quattro i campi — **senza controllare l'errore**.

Conseguenze già in atto, indipendenti da Google:

- il controllo «nome utente già preso» non scatta mai (la `select` fallisce,
  `esistente` resta `undefined`, il codice prosegue come se fosse libero);
- i dati del profilo non vengono salvati in `profiles`; sopravvivono solo in
  `user_metadata`, dove [`start/page.js:182`](../../../app/start/page.js) va a
  pescarli.

`sql/profili_completi.sql`, idempotente come l'altro:

- aggiunge le quattro colonne;
- crea un indice **unico e case-insensitive** su `username`, così l'unicità la
  garantisce il database e non una `select` che si può perdere per strada;
- allinea il trigger `handle_new_user` perché copi anche l'avatar quando arriva
  da Google.

E nel codice: i risultati di `select`/`update` su `profiles` vengono controllati.
Con l'indice unico, l'errore di violazione diventa il messaggio «Questo nome
utente è già preso», che finalmente sarà vero.

### 2.5 Il tasto

In [`SchermataAccesso`](../../../components/SchermataAccesso.js), sopra la coppia
Accedi/Iscriviti: «Continua con Google», poi un filetto con «oppure».

Un tasto solo per primo ingresso e ingressi successivi: è così che funziona
OAuth, non esiste un «iscriviti con Google» distinto da un «accedi con Google».

### 2.6 Configurazione (fuori dal codice)

`ISTRUZIONI_ACCESSO_GOOGLE.md`: creare le credenziali OAuth su Google Cloud,
incollarle in Supabase, e gli URL di redirect esatti da autorizzare — sia quello
di sviluppo sia quello di produzione. Questi passaggi si fanno a mano nei due
pannelli; il codice da solo non basta.

---

## Parte 3 — Abbinare e vendere, separati

### 3.1 Il taglio parte dal prompt

Oggi [`resellPrompt()`](../../../lib/ai/prompts.js) chiede in un colpo la scheda
del capo, i consigli di abbinamento **e** l'annuncio Vinted. Diventano due
compiti distinti:

| | `abbina` | `vendi` |
|---|---|---|
| domanda | che capo è, con cosa si mette | titolo, descrizione e prezzo per Vinted |
| risposta | `title`, `category`, `description`, `matchTips` | `title`, `category`, `priceRange`, `vintedTitle`, `vintedDescription` |
| route | `POST /api/abbina` | `POST /api/vendi` |

- `lib/ai/prompts.js`: `abbinaPrompt`/`abbinaSchema` e `vendiPrompt`/`vendiSchema`
  al posto di `resellPrompt`/`resellSchema`. `REGOLE_DI_CONDOTTA` resta condiviso.
- `lib/ai/resell.js` → `lib/ai/capo.js`, con `normalizzaAbbinamento` e
  `normalizzaVendita`. I tetti di 100 e 300 caratteri e `vintedListingUrl`
  seguono la vendita, che è l'unica che ne ha bisogno.
- I tre provider (`gemini`, `openai-compatibile`, `demo`) espongono `abbina` e
  `vendi` al posto di `resell`.
- Il dispatcher `run(task)` ([`ai/index.js:53`](../../../lib/ai/index.js)) **non
  cambia**: smista già per nome del compito.
- `/api/resell` sparisce: nessuno la chiama da fuori dal progetto. Il vecchio
  `lib/ai/resell.js` non resta accanto al nuovo `capo.js` — viene rinominato,
  così non rimangono due normalizzazioni che fanno quasi la stessa cosa.

### 3.2 Le pagine

**`/wardrobe`** torna a fare una cosa sola: «Abbina un capo». Chiama
`/api/abbina`, mostra «Che capo è» e «Come abbinarlo», e non conosce più
`AnnuncioVinted`. In fondo al risultato un tasto **«Vendilo»**.

**`/vendi`** (nuova): foto → «Scrivi l'annuncio» → `AnnuncioVinted`. Funziona
anche da sola, entrandoci dalla barra in basso.

**Il passaggio della foto.** «Vendilo» porta l'immagine a `/vendi` via
`sessionStorage` (chiave `dress:capo`), che si svuota alla chiusura della
scheda. Due pagine separate, ma senza ricaricare due volte la stessa foto.
Non `localStorage`: è un data URL da centinaia di kB e non ha motivo di
sopravvivere alla sessione.

**La dashboard** ([`dashboard/page.js:400-440`](../../../app/dashboard/page.js))
passa a `/api/abbina` e perde `<AnnuncioVinted>`; i due link in fondo diventano
«Abbina un capo» e «Vendi un capo».

### 3.3 La barra in basso

Quinta voce «Vendi» in [`Cornice.js`](../../../components/Cornice.js), in coda:
Stile · Completi · Cerca · Guardaroba · Vendi.

`gridTemplateColumns` è fissato a `repeat(4, 1fr)`
([riga 110](../../../components/Cornice.js)) e va reso dinamico sul numero di
voci, altrimenti la quinta finisce fuori dalla griglia. Su uno schermo da 360px
restano circa 72px per voce: «Guardaroba», l'etichetta più lunga, ci sta a 11px
con la spaziatura attuale.

---

## Come si verifica

Il progetto non ha un impianto di test. Le parti a logica pura vengono coperte
da script eseguibili con `node`, il resto si prova a mano.

**Automatico:**

- `lib/password.js` — già usato da tre punti, merita le sue prove:
  username validi e non, soglia dei 14 anni, password banali.
- `normalizzaAbbinamento` / `normalizzaVendita` — il taglio a 100 caratteri, il
  taglio a frase intera sotto i 300, i campi mancanti che non devono far
  esplodere niente.
- La scelta email-o-username in `/api/auth/login`: dato con `@` trattato come
  email, dato senza trattato come nome utente.

**A mano, con una lista di controllo scritta:**

- accesso con email → entra;
- accesso con nome utente → entra (oggi fallisce: è la prova che serve);
- password sbagliata → «Email o password non corretti»;
- nome utente inesistente → **la stessa identica risposta**;
- accesso con Google, primo ingresso → `/auth/completa` → dentro;
- accesso con Google, ingressi successivi → dentro, senza ripassare da `completa`;
- nome utente già preso → messaggio chiaro (oggi non scatta);
- link di conferma e link di recupero password;
- `/wardrobe` non mostra più l'annuncio; «Vendilo» porta a `/vendi` con la foto già
  caricata; `/vendi` da sola funziona;
- la barra in basso a cinque voci su uno schermo stretto.

**Quello che va verificato dal vivo:** l'URL di atterraggio dei link email
(`?code=` o `#access_token=`), che è l'osservazione mancante del punto 1.2.

## Ordine

1. Migrazione `profiles` + controllo degli errori nel codice che ci scrive.
   *(Prima di tutto: senza le colonne, sia il punto 2 sia l'accesso Google
   scrivono nel vuoto.)*
2. Login con nome utente + messaggi d'errore veri. *(Certo, indipendente, ripara
   il sintomo che si vede.)*
3. `flowType` esplicito e pagine di atterraggio che mostrano l'errore.
4. Accesso Google: `entraCon`, `/auth/callback`, `/auth/completa`,
   `/api/profile/completa`, il tasto, le istruzioni.
5. Divisione `abbina` / `vendi`: prompt, normalizzazione, provider, route.
6. Pagine `/wardrobe` e `/vendi`, dashboard, barra in basso.

## Cosa resta fuori

- **Accedi con Apple**: costa 99 €/anno, non c'è l'abbonamento.
- **Altri provider** (Facebook, GitHub): nessuno li ha chiesti.
- **Blocco su ogni pagina per i profili incompleti**: un middleware su tutte le
  richieste per un caso che capita una volta per utente.
- **Unire abbinamento e vendita in una sola chiamata** per chi vuole entrambi:
  sarebbe tornare al punto di partenza.
