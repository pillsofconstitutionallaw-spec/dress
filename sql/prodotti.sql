-- =====================================================================
-- Catalogo prodotti: i capi importati dai negozi.
-- Esegui in Supabase → SQL Editor. È idempotente.
-- =====================================================================

create table if not exists public.prodotti (
  id             bigserial primary key,
  negozio        text not null,
  id_esterno     text not null,
  titolo         text not null,
  url            text not null,
  immagine       text,

  prezzo         numeric(10,2),
  prezzo_pieno   numeric(10,2),
  valuta         text not null default 'EUR',
  disponibile    boolean not null default true,

  categoria      text,
  genere         text,                    -- uomo | donna | unisex | null
  taglie         text[] not null default '{}',

  -- Il colore in due forme: il nome che usa il negozio, e le tre coordinate
  -- percettive con cui lo confrontiamo con la palette dell'utente.
  colore_nome    text,
  colore_hex     text,
  colore_l       real,
  colore_a       real,
  colore_b       real,

  -- Indizi di qualità: composizione dichiarata e punteggio dedotto.
  tessuto        text,
  qualita        smallint,                -- 0-100, stima trasparente
  fast_fashion   boolean not null default false,

  aggiornato     timestamptz not null default now(),
  unique (negozio, id_esterno)
);

-- Colonne arrivate dopo la prima versione di questo file.
--
-- Erano state aggiunte a mano, direttamente sul database in produzione, e
-- qui non ci sono mai entrate. Il guaio non si è visto finché il database è
-- rimasto in piedi: si è visto la notte in cui è stato ricostruito da zero,
-- quando tre file su dodici hanno detto «column does not exist» e il
-- catalogo non si è potuto caricare.
--
-- Per questo stanno qui e non in un file a parte: chi ricostruisce applica
-- sql/, e sql/ deve dire tutta la verità su com'è fatta questa tabella.
alter table public.prodotti
  -- Nei negozi multimarca la marca del capo non è il negozio: da Pittarello
  -- si comprano Nike, e cercare «Nike» deve trovarle.
  add column if not exists marca text,
  -- Tutti i colori del capo, non solo il principale: quello dichiarato dal
  -- negozio più quelli letti dalla foto, ciascuno col suo peso.
  add column if not exists colori jsonb not null default '[]'::jsonb,
  -- Da dove viene il colore principale: «nome» se lo diceva il negozio,
  -- «foto» se lo abbiamo misurato noi. Serve a sapere di chi fidarsi.
  add column if not exists colore_da text;

-- Ricerche tipiche: per colore, per prezzo, per negozio.
create index if not exists prodotti_colore   on public.prodotti (colore_l, colore_a, colore_b);
create index if not exists prodotti_prezzo   on public.prodotti (prezzo);
create index if not exists prodotti_negozio  on public.prodotti (negozio);
create index if not exists prodotti_disponibile on public.prodotti (disponibile) where disponibile;

-- Il catalogo è pubblico in lettura: non contiene dati personali.
-- La scrittura resta al solo importatore, che usa la chiave di servizio.
alter table public.prodotti enable row level security;

drop policy if exists "catalogo: lettura libera" on public.prodotti;
create policy "catalogo: lettura libera"
  on public.prodotti for select
  to anon, authenticated
  using (true);

-- Il trigger dei profili scrive su "updated_at": qui la colonna si chiama
-- "aggiornato", quindi serve una funzione sua.
create or replace function public.touch_aggiornato()
returns trigger
language plpgsql
as $$
begin
  new.aggiornato = now();
  return new;
end;
$$;

drop trigger if exists prodotti_touch on public.prodotti;
create trigger prodotti_touch
  before update on public.prodotti
  for each row execute function public.touch_aggiornato();
