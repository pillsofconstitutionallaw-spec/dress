-- =====================================================================
-- Un indice spaziale sui colori, e una funzione per provarlo.
--
-- Da incollare nell'editor SQL di Supabase. NON tocca la ricerca vera:
-- aggiunge una colonna, un indice, e una funzione NUOVA che si chiama
-- capi_vicini_prova. Se dopo averlo lanciato l'app si comporta
-- diversamente, non è stato questo file.
--
-- ── perché ───────────────────────────────────────────────────────────
--
-- La ricerca senza parole scritte sfora i tre secondi, e non per colpa dei
-- filtri: è il calcolo delle distanze. Sessantamila capi per dodici colori
-- fanno settecentomila conti, e si fanno TUTTI prima di poter scegliere i
-- quaranta più vicini. Nessun riquadro può evitarli — provato e misurato:
-- i riquadri per colore escludono lo 0,2% del catalogo, cioè niente, perché
-- una palette copre davvero tutto lo spazio dei colori.
--
-- Misurare tutto per tenere quaranta è il lavoro che gli indici spaziali
-- esistono per non fare. Un indice GiST sulla terna (L, a, b) sa rispondere
-- a «i quaranta più vicini a questo colore» camminando l'albero, senza
-- toccare le altre righe: la stessa differenza che ha fatto l'indice a
-- trigrammi per le parole, da 800 ms a 100.
--
-- ── come tornare indietro ────────────────────────────────────────────
--   drop function if exists public.capi_vicini_prova(jsonb, text, int);
--   drop index if exists prodotti_colore_cube_gist;
--   alter table public.prodotti drop column if exists colore_cube;
-- =====================================================================

begin;

-- cube è l'estensione di PostgreSQL per i punti in più dimensioni. Un colore
-- Lab è un punto in tre dimensioni, e la distanza fra due colori è la
-- distanza fra due punti: è esattamente il suo mestiere.
create extension if not exists cube;

-- Calcolata dal database a ogni scrittura: l'importatore non deve saperne
-- niente, e non può dimenticarsene. Il "case" serve perché un capo senza
-- colore misurato esiste, e cube(array[null,...]) non è un punto.
alter table public.prodotti
  add column if not exists colore_cube cube
  generated always as (
    case when colore_l is null or colore_a is null or colore_b is null then null
         else cube(array[colore_l::float8, colore_a::float8, colore_b::float8])
    end
  ) stored;

create index if not exists prodotti_colore_cube_gist
  on public.prodotti using gist (colore_cube);

-- ── la funzione di prova ─────────────────────────────────────────────
--
-- Separata apposta. La ricerca vera resta quella di adesso finché i numeri
-- di questa non dicono che conviene cambiarla: è la procedura che ha
-- funzionato per le parole, e che saltandola oggi mi ha fatto sbagliare due
-- volte di fila.
--
-- Qui non c'è il prezzo, non ci sono le parole, non ci sono le tinte
-- alternative: serve a misurare UNA cosa sola, cioè se l'indice risponde
-- alla domanda «i più vicini a questo colore» senza guardarli tutti.
create or replace function public.capi_vicini_prova(
  palette       jsonb,
  genere_voluto text default null,
  per_colore    int  default 40
)
returns table (id bigint, distanza real)
language sql stable
as $$
  with voluti as (
    select cube(array[(e->>'l')::float8, (e->>'a')::float8, (e->>'b')::float8]) as punto
    from jsonb_array_elements(palette) e
  ),
  vicini as (
    select vicino.id, (vicino.colore_cube <-> v.punto)::real as d
    from voluti v
    -- "cross join lateral … order by <-> limit N" è la forma che l'indice
    -- GiST sa servire camminando: per ogni colore chiede i suoi N più
    -- vicini, e le altre righe non le tocca proprio.
    cross join lateral (
      select c.id, c.colore_cube
      from public.prodotti c
      where c.disponibile
        and c.colore_cube is not null
        and (genere_voluto is null or c.genere = genere_voluto or c.genere = 'unisex' or c.genere is null)
        and coalesce(c.genere,'') <> 'bambino'
      order by c.colore_cube <-> v.punto
      limit per_colore
    ) vicino
  )
  select vicini.id, min(vicini.d)::real as distanza
  from vicini
  group by vicini.id
  order by distanza asc;
$$;

grant execute on function public.capi_vicini_prova(jsonb, text, int) to anon, authenticated;

commit;

-- ── la verifica ──────────────────────────────────────────────────────
-- Devono uscire: la colonna piena su quasi tutti i capi, e l'indice creato.
select
  (select count(*) from public.prodotti where colore_cube is not null) as capi_con_punto,
  (select count(*) from public.prodotti where colore_cube is null)     as capi_senza_punto,
  (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'prodotti_colore_cube_gist') as indice_creato;
