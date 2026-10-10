-- Togliere dal catalogo quello che non si può più comprare.
--
-- Il grosso lo fa l'importazione, negozio per negozio: chi è stato letto
-- tutto stanotte perde subito i capi che non vende più
-- (scripts/importa-catalogo.mjs, togliSpariti). Questa è la rete sotto, per
-- i capi che lì non si possono giudicare:
--
--   - quelli dei negozi che non si leggono mai tutti, perché si fermano al
--     tetto dei 1.500 capi — a ottobre Thrifted ne aveva cinquemila che
--     nessuno guardava da settimane, tutti ancora «disponibili»;
--   - quelli dei negozi che rispondono a metà, o non rispondono più;
--   - quelli dei negozi tolti dall'elenco;
--   - gli esauriti rimasti da prima che l'importazione smettesse di
--     scriverli.
--
-- Una settimana senza essere visto basta per dire che un capo non c'è più:
-- l'importazione passa ogni notte, e un negozio giù per manutenzione torna
-- su ben prima. Se il capo invece c'è ancora, la notte che il negozio
-- risponde rientra da solo.
--
-- Il catalogo si ripesca, le persone no: qui dentro non c'è niente di
-- qualcuno. I preferiti e l'armadio tengono una copia del capo, non un
-- riferimento a questa tabella, quindi togliere una riga di qui non toglie
-- niente a nessuno.
create or replace function public.pulisci_catalogo()
returns integer
language plpgsql
security definer
-- Come aggiorna_tendenze: gira di notte, non la aspetta nessuno.
set statement_timeout = '120s'
set search_path = public
as $$
declare
  freschi integer;
  tolti   integer := 0;
  n       integer;
begin
  delete from public.prodotti where not disponibile;
  get diagnostics tolti = row_count;

  -- Se l'importazione non gira da una settimana, «non visto da una
  -- settimana» è tutto il catalogo, e la pulizia lo svuoterebbe. Quindi i
  -- capi vecchi si tolgono solo se nell'ultimo giorno l'importazione ha
  -- lavorato davvero: con meno di ventimila capi freschi c'è qualcosa di
  -- rotto, e buttare via il resto non aiuta a ripararlo.
  select count(*) into freschi
  from public.prodotti
  where aggiornato > now() - interval '1 day';

  if freschi >= 20000 then
    delete from public.prodotti where aggiornato < now() - interval '7 days';
    get diagnostics n = row_count;
    tolti := tolti + n;
  else
    raise warning 'solo % capi freschi: i capi vecchi restano dove sono', freschi;
  end if;

  return tolti;
end;
$$;

-- Una cancellazione, non una domanda: solo il lavoro notturno. Il «revoke
-- from public» viene prima, per la ragione scritta in fondo a tendenze.sql.
revoke execute on function public.pulisci_catalogo() from public, anon, authenticated;
grant execute on function public.pulisci_catalogo() to service_role;
