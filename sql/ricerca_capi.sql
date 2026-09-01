-- =====================================================================
-- La ricerca dei capi per palette.
--
-- Da incollare nell'editor SQL di Supabase. È tutto in una transazione: o
-- entra tutto, o non entra niente e resta quello che c'era. Rifarlo due
-- volte non fa danni.
--
-- La funzione cambia quello che restituisce (una colonna in più), e per
-- questo va tolta e rifatta invece che sostituita: PostgreSQL non lascia
-- cambiare il tipo di ritorno di una funzione che esiste già.
-- =====================================================================

begin;

-- La descrizione dei capi: si salva per cercarci dentro, non si mostra mai.
-- È lì che i negozi scrivono come veste un capo — un jeans largo chiamato
-- "Model 512" nel titolo non dice niente, ma nella scheda c'è scritto
-- "vestibilità ampia" — e senza, quel capo era introvabile per chi non ne
-- sapesse già il nome. La riempie scripts/importa-catalogo.mjs alla prossima
-- importazione; finché è vuota non cambia niente, e niente si rompe.
alter table public.prodotti add column if not exists descrizione text;

-- Tutte e due le versioni. Nel database ne era rimasta una vecchia a sei
-- parametri, senza "parole": PostgreSQL le tiene volentieri tutte e due, ma
-- PostgREST non sa quale scegliere quando chi chiama non nomina "parole", e
-- risponde PGRST203 invece di cercare. L'app la nomina sempre, quindi non se
-- ne accorgeva nessuno — ed è il tipo di trabocchetto che si scopre il
-- giorno in cui si scrive una chiamata nuova.
drop function if exists public.capi_per_palette(jsonb, numeric, numeric, text, boolean, int);
drop function if exists public.capi_per_palette(jsonb, numeric, numeric, text, boolean, int, text[]);

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
  descrizione text,
  distanza real
)
language sql stable
  -- Il piano di esecuzione dice una cosa contro l'intuito: l'indice sui
  -- colori COSTA invece di far risparmiare. Postgres stima quaranta righe
  -- dove ne trova trentaseimila, sceglie l'indice, e leggere il disco a
  -- salti su quelle righe prende oltre tre secondi — mentre scorrere tutta
  -- la tabella di fila ne prende cinquantaquattro, di millisecondi.
  -- Con dodici colori in palette il riquadro copre quasi tutto il catalogo:
  -- un indice che non scarta niente è solo un giro più lungo.
  -- Misurato: 1236 ms con l'indice, 1071 ms senza, stesse identiche righe.
  set enable_indexscan = off
  set enable_bitmapscan = off
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
    -- Solo le colonne che servono a misurare i colori, non tutta la riga.
    --
    -- Qui c'era "select p.*", e finché la descrizione era vuota non costava
    -- niente. Riempiendola sono arrivati 19,6 MB di testo — 408 caratteri
    -- per capo su cinquantamila capi — che questo passaggio si trascinava
    -- fino in fondo senza che nessuno li guardasse: i passaggi dopo usano
    -- cinque colonne, e la riga vera la si rilegge comunque alla fine,
    -- ritrovandola per id. La ricerca è passata da 1,7 a 2,3 secondi il
    -- giorno in cui il campo si è riempito, e la causa non era il campo:
    -- era questa riga, che chiedeva tutto da sempre.
    select p.id, p.colore_l, p.colore_a, p.colore_b, p.colori
    from public.prodotti p, limiti li
    where p.disponibile
      and p.colore_l between li.lmin and li.lmax
      and p.colore_a between li.amin and li.amax
      and p.colore_b between li.bmin and li.bmax
      and (prezzo_min is null or p.prezzo >= prezzo_min)
      and (prezzo_max is null or p.prezzo <= prezzo_max)
      -- Il genere. Il vecchio filtro finiva con "or p.genere is null", e
      -- quel pezzo lo apriva a tutti: un capo su tre non ha il genere
      -- scritto — 22.966 su 68.897 — perché molti negozi non lo pubblicano,
      -- e passavano tutti senza pagare pegno, ordinati solo per colore. Chi
      -- impostava "uomo" si ritrovava reggiseni e pigiami da donna.
      -- Restano, perché escluderli toglierebbe un terzo del catalogo, ma
      -- vanno in fondo: la pertinenza qui sotto se ne occupa.
      and (genere_voluto is null or p.genere = genere_voluto or p.genere = 'unisex' or p.genere is null)
      -- I capi da bambino non sono di un altro genere: sono di un'altra
      -- persona, e non c'è nessun adulto a cui vada bene vederseli proporre.
      --
      -- Qui c'era anche una regex sul titolo, e ha mandato la ricerca in
      -- timeout: gira su ogni riga del catalogo, senza indice — la funzione
      -- li spegne apposta, vedi sopra — e costa sei volte un confronto
      -- secco. Il conto non si vede provandola da sola su una riga; si vede
      -- quando la si fa girare su tutte.
      --
      -- E non serviva: il titolo lo legge già perChiE() in lib/capiPalette.js,
      -- su ogni ricerca, e lo legge meglio, perché sa che "Baby Blue" è un
      -- colore. Qui basta il genere scritto in colonna, che per 1.342 capi
      -- l'abbiamo messo giusto.
      and coalesce(p.genere,'') <> 'bambino' 
      and (not escludi_fast or not p.fast_fashion)
      and (
        parole is null
        or exists (
          select 1 from unnest(parole) k
          where p.titolo ilike '%' || k || '%'
             or coalesce(p.categoria,'') ilike '%' || k || '%'
             or coalesce(p.marca,'') ilike '%' || k || '%'
             or coalesce(p.colore_nome,'') ilike '%' || k || '%'
             -- La descrizione entra qui e basta: serve a non lasciare fuori
             -- il capo che nel titolo non dice come veste. Quanto conta lo
             -- decide chi ordina, e conta pochissimo.
             or coalesce(p.descrizione,'') ilike '%' || k || '%'
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
grant execute on function public.capi_per_palette(jsonb, numeric, numeric, text, boolean, int, text[]) to anon, authenticated;

commit;

-- ── la verifica ──────────────────────────────────────────────────────
-- Deve uscire UNA riga sola, con sette parametri e descrizione = true.
-- Due righe vuol dire che la vecchia versione è ancora lì; descrizione a
-- false vuol dire che è stata incollata una copia vecchia di questo file.
select
  pg_get_function_arguments(p.oid) like '%parole%'        as ha_parole,
  pg_get_function_result(p.oid)    like '%descrizione%'   as ha_descrizione
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'capi_per_palette';
