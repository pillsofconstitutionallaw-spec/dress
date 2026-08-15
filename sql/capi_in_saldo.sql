-- Gli sconti veri, scelti dal database invece che dopo.
--
-- Prima la pagina chiedeva i 600 capi col PREZZO DI LISTINO più alto e solo
-- dopo, in JavaScript, guardava quali fossero davvero ribassati. Due difetti
-- in una riga sola: gli sconti che uscivano erano sempre e solo quelli dei
-- capi più cari in catalogo — cappotti da mille euro — e sui venticinquemila
-- capi realmente scontati se ne vedevano al massimo una ventina.
--
-- Qui il filtro è dove deve stare: nel database, su tutto il catalogo.

create index if not exists prodotti_saldi
  on public.prodotti ((((prezzo_pieno - prezzo) / prezzo_pieno)) desc)
  where disponibile
    and prezzo_pieno is not null
    and prezzo > 0
    and prezzo_pieno > prezzo;

create or replace function public.capi_in_saldo(
  genere_voluto text default null,
  sconto_minimo int default 10,
  per_negozio   int default 3,
  quanti        int default 40
)
returns table (
  id bigint, negozio text, marca text, titolo text, url text, immagine text,
  prezzo numeric, prezzo_pieno numeric, categoria text, genere text,
  colore_nome text, colore_hex text, tessuto text,
  qualita smallint, fast_fashion boolean, sconto int
)
language sql stable
as $$
  with scontati as (
    select p.id, p.negozio, p.marca, p.titolo, p.url, p.immagine,
           p.prezzo, p.prezzo_pieno, p.categoria, p.genere,
           p.colore_nome, p.colore_hex, p.tessuto,
           p.qualita, p.fast_fashion,
           round((1 - p.prezzo / p.prezzo_pieno) * 100)::int as sconto,
           -- Chi ha detto di essere uomo vede prima i capi da uomo. Quelli
           -- senza genere scritto restano, ma in fondo: escluderli toglierebbe
           -- metà catalogo, perché è un dato che molti negozi non compilano.
           case
             when genere_voluto is null then 0
             when p.genere = genere_voluto then 0
             when p.genere = 'unisex' then 1
             else 2
           end as pertinenza
    from public.prodotti p
    where p.disponibile
      and p.prezzo_pieno is not null
      and p.prezzo > 0
      and p.prezzo_pieno > prezzo
      and round((1 - p.prezzo / p.prezzo_pieno) * 100)::int >= sconto_minimo
      and (genere_voluto is null or p.genere is distinct from
           (case when genere_voluto = 'uomo' then 'donna' else 'uomo' end))
  ),
  ordinati as (
    select s.*,
           row_number() over (
             partition by s.negozio
             order by s.pertinenza asc, s.sconto desc, s.qualita desc nulls last
           ) as posto
    from scontati s
  )
  select o.id, o.negozio, o.marca, o.titolo, o.url, o.immagine,
         o.prezzo, o.prezzo_pieno, o.categoria, o.genere,
         o.colore_nome, o.colore_hex, o.tessuto,
         o.qualita, o.fast_fashion, o.sconto
  from ordinati o
  -- Non più di N capi per negozio: altrimenti la pagina diventa la vetrina
  -- di chi ha fatto i saldi più aggressivi.
  where o.posto <= per_negozio
  order by o.pertinenza asc, o.sconto desc, o.qualita desc nulls last
  limit quanti;
$$;

grant execute on function public.capi_in_saldo(text, int, int, int) to anon, authenticated;
