import { createClient } from '@supabase/supabase-js';

// Client lato browser, creato solo se le variabili pubbliche esistono:
// senza Supabase configurato l'app continua a funzionare in locale.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _client = null;

export function hasAccounts() {
  return Boolean(URL && ANON);
}

export function getSupabaseBrowser() {
  if (!hasAccounts()) return null;
  if (!_client) {
    _client = createClient(URL, ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Il link di conferma dell'email riporta qui la sessione nell'URL.
        detectSessionInUrl: true,
        // Dichiarato, e non lasciato al caso.
        //
        // Questo era il default implicito della libreria, e le pagine di
        // atterraggio erano invece scritte per PKCE (?code=…): i due capi non
        // si parlavano, e quando il formato non corrispondeva il client non
        // riconosceva né l'uno né l'altro — restituendo "nessuna sessione"
        // senza un errore, in silenzio. Da lì "il link non è più valido" su
        // link validissimi.
        //
        // Fra i due si resta su 'implicit', e non è una resa al default:
        // PKCE tiene il verificatore nel browser che ha CHIESTO il link,
        // quindi la mail va aperta sullo stesso dispositivo. Chi si iscrive
        // dal computer e legge la posta dal telefono non entrerebbe più.
        // Quel giro deve continuare a funzionare.
        //
        // Le pagine di atterraggio ora reggono entrambi i formati e mostrano
        // l'errore invece di ingoiarlo: se questa scelta andrà rivista, il
        // motivo si leggerà a schermo invece di sparire.
        flowType: "implicit",

        // Le passkey — cioè Face ID e impronta — sono ancora contrassegnate
        // come sperimentali dalla libreria, e senza questa riga ogni metodo
        // che le riguarda solleva un errore invece di funzionare.
        experimental: { passkey: true },
      },
    });
  }
  return _client;
}

export default getSupabaseBrowser;
