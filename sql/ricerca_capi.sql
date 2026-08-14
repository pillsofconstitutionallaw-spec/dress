create or replace function public.capi_per_palette(
  palette      jsonb,
  prezzo_min   numeric default null,
  prezzo_max   numeric default null,
  genere_voluto text   default null,
  escludi_fast boolean default false,
  quanti       int     default 60,
  parole       text[]  default null
)
returns table (
  id bigint, negozio text, marca text, titolo text, url text, immagine text,
  prezzo numeric, prezzo_pieno numeric, categoria text, genere text,
  taglie text[], colore_nome text, colore_hex text,
  colore_l real, colore_a real, colore_b real,
  tessuto text, qualita smallint, fast_fashion boolean,
  distanza real
)
language sql stable
as $$
  with voluti as (
    select (e->>'l')::real as l, (e->>'a')::real as a, (e->>'b')::real as b
    from jsonb_array_elements(palette) e
  ),
  -- I limiti come DUE NUMERI, non come tabella da confrontare riga per riga.
  -- Contro una tabella temporanea Postgres non usa l'indice e scansiona
  -- trentaseimila righe una per una: erano quasi cinque secondi. Con un
  -- intervallo scalare l'indice su (colore_l, colore_a, colore_b) entra in
  -- gioco e il grosso del catalogo viene scartato prima di toccarlo.
  limiti as (
    select min(l) - 38 as lmin, max(l) + 38 as lmax,
           min(a) - 40 as amin, max(a) + 40 as amax,
           min(b) - 40 as bmin, max(b) + 40 as bmax
    from voluti
  ),
  ammessi as (
    select p.*
    from public.prodotti p, limiti li
    where p.disponibile
      and p.colore_l between li.lmin and li.lmax
      and p.colore_a between li.amin and li.amax
      and p.colore_b between li.bmin and li.bmax
      and (prezzo_min is null or p.prezzo >= prezzo_min)
      and (prezzo_max is null or p.prezzo <= prezzo_max)
      and (genere_voluto is null or p.genere = genere_voluto or p.genere = 'unisex' or p.genere is null)
      and (not escludi_fast or not p.fast_fashion)
      and (
        parole is null
        or exists (
          select 1 from unnest(parole) k
          where p.titolo ilike '%' || k || '%'
             or coalesce(p.categoria,'') ilike '%' || k || '%'
             or coalesce(p.colore_nome,'') ilike '%' || k || '%'
        )
      )
  ),
  tinte as (
    select a.id,
           coalesce((c->>'l')::real, a.colore_l) as l,
           coalesce((c->>'a')::real, a.colore_a) as a,
           coalesce((c->>'b')::real, a.colore_b) as b
    from ammessi a
    left join lateral jsonb_array_elements(
      case when jsonb_array_length(a.colori) > 0 then a.colori else '[null]'::jsonb end
    ) c on true
  ),
  migliori as (
    select t.id, min(sqrt(power(t.l - v.l, 2) + power(t.a - v.a, 2) + power(t.b - v.b, 2)))::real as distanza
    from tinte t cross join voluti v
    where t.l is not null
    group by t.id
  )
  select p.id, p.negozio, p.marca, p.titolo, p.url, p.immagine,
         p.prezzo, p.prezzo_pieno, p.categoria, p.genere,
         p.taglie, p.colore_nome, p.colore_hex,
         p.colore_l, p.colore_a, p.colore_b,
         p.tessuto, p.qualita, p.fast_fashion, m.distanza
  from migliori m
  join public.prodotti p on p.id = m.id
  where m.distanza <= 34
  order by m.distanza asc, p.qualita desc nulls last
  limit quanti;
$$;
grant execute on function public.capi_per_palette(jsonb, numeric, numeric, text, boolean, int, text[]) to anon, authenticated;
