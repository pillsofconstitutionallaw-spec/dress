-- Quanti capi ha rinfrescato ogni negozio, da un certo momento in poi.
--
-- La usa scripts/controlla-importazione.mjs, subito dopo l'importazione
-- notturna. Prima quel controllo faceva centodieci domande separate al
-- database — una per il totale, una per negozio — e ognuna filtrava su
-- «aggiornato», che non ha un indice: ogni domanda rileggeva tutta la
-- tabella. Col catalogo a 244 MB una lettura intera prende dai sette ai
-- dodici secondi, il limite del servizio è otto, e il lavoro falliva tre
-- notti su dieci con l'importazione riuscita — saltando anche il passo dopo,
-- quello che riconta le tendenze.
--
-- L'indice su «aggiornato» non è la risposta: quella colonna cambia su ogni
-- capo ogni notte, e un indice lì costringerebbe Postgres a riscrivere tutti
-- gli indici della tabella a ogni aggiornamento, invece di toccare solo la
-- riga. Si pagherebbe ogni notte per risparmiare una domanda al giorno.
--
-- Quindi: una lettura sola, raggruppata per negozio, e il tempo che serve.
create or replace function public.capi_freschi(da timestamptz)
returns table (negozio text, quanti bigint)
language sql
stable
security definer
-- Come aggiorna_tendenze: non la aspetta nessuno, gira di notte, e deve
-- continuare a finire anche quando il catalogo raddoppia.
set statement_timeout = '120s'
set search_path = public
as $$
  select p.negozio, count(*) as quanti
  from public.prodotti p
  where p.aggiornato >= da
  group by p.negozio;
$$;

-- Solo il lavoro notturno. Il «revoke from public» viene prima, per la
-- ragione scritta in fondo a tendenze.sql.
revoke execute on function public.capi_freschi(timestamptz) from public, anon, authenticated;
grant execute on function public.capi_freschi(timestamptz) to service_role;
