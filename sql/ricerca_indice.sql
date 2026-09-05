-- =====================================================================
-- La ricerca che usa l'indice spaziale. ANCORA DA PROVARE.
--
-- Da incollare DOPO sql/colore_vicino.sql, che crea la colonna e l'indice.
--
-- Si chiama capi_per_palette_v2, con il _v2: la ricerca vera è ancora
-- capi_per_palette e nessuno la tocca. Questo file non può cambiare come si
-- comporta l'app — serve a farmi misurare la versione nuova accanto alla
-- vecchia, sulla stessa macchina e sugli stessi dati, prima di scambiarle.
--
-- ── cosa cambia rispetto alla ricerca di adesso ──────────────────────
--
-- Solo come si scelgono i capi candidati. Tutto il resto — parole, genere,
-- bambini, prezzo, tinte alternative, soglia di distanza, ordine — è
-- identico, riga per riga.
--
-- Prima: un riquadro di colori, e dentro finivano quasi tutti i capi
-- disponibili, che poi andavano misurati uno per uno. Settecentomila
-- distanze per rispondere con quaranta capi, e oltre tre secondi.
--
-- Adesso: all'indice si chiedono direttamente gli N più vicini a ogni
-- colore. Misurato sulla funzione di prova, dodici colori sul catalogo
-- vero: 95-140 ms contro il fuori-tempo-massimo di adesso.
--
-- ── quello che so che cambia nei risultati ───────────────────────────
--
-- Un capo con più tinte entra fra i candidati per la sua tinta principale.
-- Se la principale è lontana da tutti i colori della palette ma una
-- secondaria è vicinissima, prima poteva entrare lo stesso e adesso no.
-- Con dodici colori per centoventi capi ciascuno i candidati sono più di
-- mille, e se ne mostrano quaranta: perché la differenza si veda dovrebbe
-- esserci un capo più azzeccato di mille altri per un colore che non è il
-- suo. Va detto, non va nascosto — ma è questo l'ordine di grandezza.
--
-- ── come tornare indietro ────────────────────────────────────────────
--   drop function if exists public.capi_per_palette_v2(jsonb, numeric, numeric, text, boolean, int, text[]);
-- La ricerca vera non è stata toccata, quindi non c'è altro da disfare.
-- =====================================================================

begin;

drop function if exists public.capi_per_palette_v2(jsonb, numeric, numeric, text, boolean, int, text[]);

create or replace function public.capi_per_palette_v2(
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
  descrizione text,
  distanza real
)
language sql stable
  -- L'indice sui colori torna acceso, ed è il punto di tutto il file.
  --
  -- Era spento per una ragione che era vera: il riquadro unico copriva quasi
  -- tutto il catalogo — misurato, il 95% con quattro colori e il 100% con
  -- sei — quindi l'indice non scartava niente e leggere il disco a salti
  -- costava più che scorrere la tabella di fila.
  --
  -- Con dodici riquadri piccoli quella ragione cade: ognuno tocca una fetta
  -- sottile del catalogo, ed è esattamente il lavoro per cui un indice su
  -- (colore_l, colore_a, colore_b) esiste.
  --
  -- Se invece rallentasse, si rincolla sql/ricerca_parole.sql e si torna
  -- com'era: quel file è la versione di adesso, intera.
as $$
  with voluti as (
    select (e->>'l')::real as l, (e->>'a')::real as a, (e->>'b')::real as b,
           -- lo stesso colore come punto, che è la forma che l'indice capisce
           cube(array[(e->>'l')::float8, (e->>'a')::float8, (e->>'b')::float8]) as punto
    from jsonb_array_elements(palette) e
  ),
  -- I candidati li sceglie l'indice, non il calcolo.
  --
  -- Qui c'era un riquadro — prima uno solo largo quanto la palette, poi uno
  -- per colore — e in tutti e due i casi finivano dentro quasi tutti i capi
  -- disponibili, che poi andavano misurati uno per uno: settecentomila
  -- distanze per rispondere con quaranta capi. Sforava i tre secondi.
  --
  -- «order by colore_cube <-> punto limit N» è invece una domanda che
  -- l'indice GiST serve camminando l'albero: prende gli N più vicini a quel
  -- colore e le altre righe non le tocca. Misurato sul catalogo vero, dodici
  -- colori: da oltre 3.000 ms (fuori tempo massimo) a 95-140 ms.
  --
  -- I filtri stanno DENTRO il lateral, non fuori: così l'indice cammina
  -- finché non ha trovato N capi che vanno bene davvero, invece di
  -- consegnarne N e vederseli scartare dopo.
  vicini as (
    select vicino.id
    from voluti v
    cross join lateral (
      select c.id
      from public.prodotti c
      where c.disponibile
        and c.colore_cube is not null
        and (prezzo_min is null or c.prezzo >= prezzo_min)
        and (prezzo_max is null or c.prezzo <= prezzo_max)
        and (genere_voluto is null or c.genere = genere_voluto or c.genere = 'unisex' or c.genere is null)
        and coalesce(c.genere,'') <> 'bambino'
        and (not escludi_fast or not c.fast_fashion)
        and (
          parole is null
          or c.cerca ilike any (array(select '%' || k || '%' from unnest(parole) k))
        )
      order by c.colore_cube <-> v.punto
      limit greatest(40, quanti / 3)
    ) vicino
  ),
  -- Un capo vicino a tre colori esce tre volte: qui si conta una volta sola,
  -- e a misurare le distanze ci pensa il passaggio dopo.
  ammessi as (
    select distinct p.id, p.colore_l, p.colore_a, p.colore_b, p.colori
    from vicini
    join public.prodotti p on p.id = vicini.id
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
  -- La distanza fra ogni tinta del capo e ogni colore della palette. È il
  -- pezzo caro di tutta la ricerca: un capo ha in media 1,31 tinte e la
  -- palette dodici colori, quindi su settantamila capi sono più di un
  -- milione di conti, e si fanno tutti prima di poter scartare qualcosa.
  --
  -- Due sprechi, tolti:
  --
  -- power(x, 2) è una chiamata di funzione che passa per il tipo numerico;
  -- (x)*(x) su due real è una moltiplicazione e basta.
  --
  -- E la radice quadrata non serviva: fra due distanze, quella più piccola
  -- ha anche il quadrato più piccolo. Ordinare e confrontare sul quadrato dà
  -- esattamente lo stesso risultato, e la radice si fa una volta sola alla
  -- fine, sulle poche righe che escono, invece di un milione di volte su
  -- quelle che verranno buttate.
  migliori as (
    select t.id, min(
             (t.l - v.l) * (t.l - v.l) +
             (t.a - v.a) * (t.a - v.a) +
             (t.b - v.b) * (t.b - v.b)
           ) as quadrato
    from tinte t cross join voluti v
    where t.l is not null
    group by t.id
  )
  select p.id, p.negozio, p.marca, p.titolo, p.url, p.immagine,
         p.prezzo, p.prezzo_pieno, p.categoria, p.genere,
         p.taglie, p.colore_nome, p.colore_hex,
         p.colore_l, p.colore_a, p.colore_b,
         p.tessuto, p.qualita, p.fast_fashion, p.descrizione,
         sqrt(m.quadrato)::real as distanza
  from migliori m
  join public.prodotti p on p.id = m.id
  -- 34 di distanza, cioè 1156 di quadrato: la stessa soglia, sull'altra
  -- faccia dello stesso numero.
  where m.quadrato <= 34 * 34
  -- Prima per chi è il capo, poi per quanto il colore corrisponde.
  -- L'ordine dei due conta: col colore per primo, i capi senza genere si
  -- infilavano fra quelli giusti ogni volta che erano di una tinta più
  -- vicina, ed è esattamente com'è finito un reggiseno in mezzo.
  order by (case
              when genere_voluto is null then 0
              when p.genere = genere_voluto then 0
              when p.genere = 'unisex' then 1
              else 2
            end) asc,
           m.quadrato asc,
           p.qualita desc nulls last
  limit quanti;
$$;
grant execute on function public.capi_per_palette_v2(jsonb, numeric, numeric, text, boolean, int, text[]) to anon, authenticated;

commit;

-- ── la verifica ──────────────────────────────────────────────────────
-- Una riga sola, con «cerca» dentro la definizione della funzione: vuol dire
-- che è entrata questa versione e non un'altra.
select p.proname,
       pg_get_functiondef(p.oid) like '%p.cerca ilike any%' as usa_la_colonna,
       pg_get_functiondef(p.oid) like '%enable_bitmapscan%' as bitmap_ancora_spenta
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'capi_per_palette_v2';
