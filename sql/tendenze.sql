-- Cosa si porta adesso, misurato sul catalogo invece che indovinato.
-- I negozi comprano quello che vende: contare i tagli nei loro cataloghi è
-- il modo più onesto che abbiamo di sapere cosa va, senza chiederlo a un
-- modello che si ferma alla sua data di addestramento.
create or replace function public.tendenze_tagli()
returns table (taglio text, quanti bigint)
language sql
stable
as $$
  with vocabolario(taglio, chiavi) as (values
    ('Baggy',            array['%baggy%']),
    ('Gamba larga',      array['%wide leg%','%gamba larga%','%palazzo%']),
    ('Cargo',            array['%cargo%']),
    ('Oversize',         array['%oversize%']),
    ('Crop',             array['%crop%']),
    ('Vita alta',        array['%vita alta%','%high waist%']),
    ('Flare / zampa',    array['%flare%','%zampa%']),
    ('Dritto',           array['%dritt%','%straight%']),
    ('Slim',             array['%slim%']),
    ('Mom',              array['%mom %']),
    ('Barrel',           array['%barrel%']),
    ('Bootcut',          array['%bootcut%']),
    ('Skinny',           array['%skinny%']),
    ('Boyfriend',        array['%boyfriend%'])
  )
  select v.taglio, count(p.id) as quanti
  from vocabolario v
  left join public.prodotti p
    on p.disponibile and exists (select 1 from unnest(v.chiavi) k where p.titolo ilike k)
  group by v.taglio
  having count(p.id) > 0
  order by quanti desc;
$$;

grant execute on function public.tendenze_tagli() to anon, authenticated;

-- --------------------------------------------------------------------------
-- Il conteggio non si fa più mentre qualcuno aspetta.
--
-- La funzione qui sopra resta quella che conta davvero, ma prende sei secondi
-- — quattordici parole cercate dentro centoquattordicimila titoli — e il
-- database ne concede otto. Era un lancio di moneta, e ogni notte che il
-- catalogo cresce la moneta pesa un po' di più dalla parte sbagliata.
--
-- Quindi: si conta una volta a notte, subito dopo l'importazione, e il
-- risultato resta qui. Quattordici righe che la pagina legge in un istante.
-- --------------------------------------------------------------------------
create table if not exists public.tendenze (
  taglio    text primary key,
  quanti    bigint not null,
  calcolato timestamptz not null default now()
);

-- Come il catalogo da cui viene: pubblica in lettura, perché sono conteggi e
-- non riguardano nessuno. In scrittura solo il lavoro notturno, che usa la
-- chiave di servizio e non passa da qui.
alter table public.tendenze enable row level security;

drop policy if exists "tendenze: lettura libera" on public.tendenze;
create policy "tendenze: lettura libera"
  on public.tendenze for select
  to anon, authenticated
  using (true);

create or replace function public.aggiorna_tendenze()
returns integer
language plpgsql
security definer
-- Il limite di tempo dei ruoli — tre secondi per anon, otto per il servizio —
-- è pensato per le domande che fa una persona in attesa. Questa non la
-- aspetta nessuno: gira di notte dentro il lavoro del catalogo, e se il
-- catalogo raddoppia deve continuare a finire. Due minuti sono larghi apposta.
set statement_timeout = '120s'
set search_path = public
as $$
declare
  scritte integer;
begin
  -- Dentro una transazione sola: chi legge in questo momento vede o i
  -- conteggi di ieri o quelli di oggi, mai una tabella mezza vuota.
  --
  -- Il «where true» sembra inutile e non lo è: Supabase tiene acceso un
  -- guardrail che rifiuta le delete senza where — «DELETE requires a WHERE
  -- clause» — perché una delete senza where di solito è una riga scritta
  -- male, non una voluta. Qui è voluta: la tabella si rifà tutta ogni notte.
  delete from public.tendenze where true;
  insert into public.tendenze (taglio, quanti)
    select taglio, quanti from public.tendenze_tagli();
  get diagnostics scritte = row_count;
  return scritte;
end;
$$;

-- Non è una domanda, è una scrittura: la fa solo il lavoro notturno. In
-- Postgres una funzione nuova nasce eseguibile da chiunque, quindi prima si
-- toglie a tutti e poi si ridà a chi serve — in quest'ordine, perché il
-- «revoke from public» toglie anche a service_role, che l'eseguibilità la
-- eredita da lì e non da un permesso suo.
revoke execute on function public.aggiorna_tendenze() from public, anon, authenticated;
grant execute on function public.aggiorna_tendenze() to service_role;
