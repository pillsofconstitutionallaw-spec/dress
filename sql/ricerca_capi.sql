-- =====================================================================
-- Trova i capi del catalogo più vicini ai colori della palette.
--
-- Il confronto avviene nello spazio Lab, dove la distanza fra due colori
-- corrisponde a quanto l'occhio li vede diversi. Un capo a fantasia ha più
-- colori: vale il più vicino, così una camicia verde e blu si trova sia
-- cercando il verde sia cercando il blu.
--
-- Qui si usa la distanza semplice, che è veloce e basta a scremare; il
-- riordino fine con CIEDE2000 lo fa l'applicazione sui pochi risultati.
-- =====================================================================

create or replace function public.capi_per_palette(
  palette      jsonb,                    -- [{"l":..,"a":..,"b":..}, ...]
  prezzo_min   numeric default null,
  prezzo_max   numeric default null,
  genere_voluto text   default null,     -- 'donna' | 'uomo' | null = tutti
  escludi_fast boolean default false,
  quanti       int     default 60
)
returns table (
  id bigint, negozio text, titolo text, url text, immagine text,
  prezzo numeric, prezzo_pieno numeric, categoria text, genere text,
  taglie text[], colore_nome text, colore_hex text,
  colore_l real, colore_a real, colore_b real,
  tessuto text, qualita smallint, fast_fashion boolean,
  distanza real
)
language sql
stable
as $$
  with voluti as (
    select (e->>'l')::real as l, (e->>'a')::real as a, (e->>'b')::real as b
    from jsonb_array_elements(palette) e
  ),
  -- ogni colore di ogni capo: quello dichiarato più quelli letti dalla foto
  tinte as (
    select p.id,
           coalesce((c->>'l')::real, p.colore_l) as l,
           coalesce((c->>'a')::real, p.colore_a) as a,
           coalesce((c->>'b')::real, p.colore_b) as b
    from public.prodotti p
    left join lateral jsonb_array_elements(
      case when jsonb_array_length(p.colori) > 0 then p.colori else '[null]'::jsonb end
    ) c on true
    where p.disponibile
      and p.colore_l is not null
      and (prezzo_min is null or p.prezzo >= prezzo_min)
      and (prezzo_max is null or p.prezzo <= prezzo_max)
      and (genere_voluto is null or p.genere = genere_voluto or p.genere = 'unisex' or p.genere is null)
      and (not escludi_fast or not p.fast_fashion)
  ),
  -- per ogni capo, quanto dista il suo colore più azzeccato
  migliori as (
    select t.id, min(sqrt(power(t.l - v.l, 2) + power(t.a - v.a, 2) + power(t.b - v.b, 2)))::real as distanza
    from tinte t cross join voluti v
    where t.l is not null
    group by t.id
  )
  select p.id, p.negozio, p.titolo, p.url, p.immagine,
         p.prezzo, p.prezzo_pieno, p.categoria, p.genere,
         p.taglie, p.colore_nome, p.colore_hex,
         p.colore_l, p.colore_a, p.colore_b,
         p.tessuto, p.qualita, p.fast_fashion,
         m.distanza
  from migliori m
  join public.prodotti p on p.id = m.id
  where m.distanza <= 34
  order by m.distanza asc, p.qualita desc nulls last
  limit quanti;
$$;

-- Chiunque può cercare nel catalogo: non contiene dati personali.
grant execute on function public.capi_per_palette(jsonb, numeric, numeric, text, boolean, int)
  to anon, authenticated;
