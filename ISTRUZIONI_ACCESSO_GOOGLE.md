# Accendere l'accesso con Google

Il codice è pronto. Mancano le credenziali, che si creano a mano in due
pannelli: Google Cloud le rilascia, Supabase le usa. Dieci minuti.

Finché non fai questi passaggi, il tasto «Continua con Google» compare ma
Supabase risponde che il provider non è abilitato. Tutto il resto dell'app
(iscrizione con email, accesso, recupero password) funziona lo stesso.

---

## 1. L'indirizzo di ritorno, da Supabase

Serve per primo perché va incollato in Google.

1. Vai su **supabase.com** → il progetto → **Authentication** → **Sign In / Providers**.
2. Apri **Google** e copia il **Callback URL (for OAuth)**. Ha questa forma:

   ```
   https://ejwyrzqhqkwuwrxkxurw.supabase.co/auth/v1/callback
   ```

Tienilo da parte.

## 2. Le credenziali, da Google Cloud

1. Vai su **console.cloud.google.com** ed entra con l'account Google che vuoi
   usare come proprietario.
2. In alto, crea un progetto nuovo (per esempio `Dress`) o scegline uno esistente.
3. Menù → **API e servizi** → **Schermata consenso OAuth**.
   - Tipo di utente: **Esterno**.
   - Nome dell'app: `Dress`. Email di assistenza e di contatto: la tua.
   - Salva e continua fino in fondo. Gli **ambiti** lasciali come sono: servono
     solo `email` e `profile`, che ci sono già.
   - Finché l'app è in **Test**, possono entrare solo gli indirizzi che aggiungi
     a mano in «Utenti di test». Per aprirla a tutti, premi **Pubblica app**.
4. Menù → **API e servizi** → **Credenziali** → **Crea credenziali** →
   **ID client OAuth**.
   - Tipo di applicazione: **Applicazione web**.
   - Nome: `Dress web`.
   - **URI di reindirizzamento autorizzati** → Aggiungi URI → incolla il
     Callback URL di Supabase copiato al punto 1.
   - Crea. Google mostra **ID client** e **Client secret**: copiali.

> Il redirect da autorizzare in Google è **solo** quello di Supabase. Gli
> indirizzi di Dress (`localhost` e il sito su Vercel) non vanno qui: li
> gestisce Supabase al punto 4.

## 3. Incollarle in Supabase

1. Torna in **Authentication** → **Sign In / Providers** → **Google**.
2. Accendi l'interruttore **Enable Sign in with Google**.
3. Incolla **Client ID** e **Client Secret**.
4. Salva.

## 4. Gli indirizzi di ritorno di Dress

Supabase accetta di rimandare l'utente solo verso indirizzi che conosce.

**Authentication** → **URL Configuration**:

- **Site URL**: l'indirizzo del sito in produzione, per esempio
  `https://dress.vercel.app`
- **Redirect URLs**, uno per riga:

  ```
  http://localhost:3000/**
  https://dress.vercel.app/**
  ```

Sostituisci `dress.vercel.app` con il dominio vero. Senza queste righe l'accesso
parte, Google acconsente, e poi l'utente rimbalza fuori.

## 5. La variabile del sito

In **Vercel** → il progetto → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_SITE_URL = https://dress.vercel.app
```

Serve ai link dentro le mail di conferma e di recupero password. In locale
lasciala vuota o su `http://localhost:3000`: se in produzione resta puntata su
localhost, le mail mandano la gente sul computer di chi ha fatto il deploy.

---

## Provare che funzioni

1. Apri Dress, premi **Continua con Google**, scegli l'account.
2. Al primo ingresso devi atterrare su **«Manca poco»**, con nome e cognome già
   compilati da Google, e ti vengono chiesti **nome utente** e **data di nascita**.
3. Al secondo ingresso devi entrare diretto, senza ripassare da lì.

Se qualcosa non va, il messaggio d'errore ora si vede a schermo invece di
sparire: leggilo, dice quale dei passaggi qui sopra manca.

## Quello che non c'è

**Accedi con iCloud** (Sign in with Apple) non è previsto: sul web richiede una
Services ID e una chiave firmata, che si creano solo con un **Apple Developer
Program attivo, 99 €/anno**. Il giorno che serve, si aggiunge allora — il giro
è lo stesso di Google, con un provider in più in `entraCon()`.
