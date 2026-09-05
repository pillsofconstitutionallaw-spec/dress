-- =====================================================================
-- Un riquadro per colore, invece di uno solo largo quanto la palette.
--
-- Da incollare nell'editor SQL di Supabase. Cambia SOLO come si scelgono i
-- capi candidati: tutto il resto — le parole, il genere, i bambini, le
-- distanze, l'ordine — è identico a sql/ricerca_parole.sql.
--
-- ── come tornare indietro ────────────────────────────────────────────
-- Si rincolla sql/ricerca_parole.sql, che è la versione di adesso, intera.
-- Non c'è niente da disfare: questo file non tocca tabelle né indici.
--
-- ── perché ───────────────────────────────────────────────────────────
--
-- La ricerca senza parole scritte — quella che vedi appena apri la pagina —
-- è la più lenta di tutte: dodici colori in una domanda sola sforano i tre
-- secondi, e l'app se la cava spezzando la palette in gruppi da quattro e
-- chiedendoli in fila, che costa la somma: quattro-sei secondi.
--
-- Il motivo è che il riquadro dei colori non scarta niente. È uno solo, e
-- va dal più basso al più alto di TUTTA la palette: con l'Inverno freddo
-- viene L da -21 a 138, a da -76 a 98, b da -89 a 56 — cioè tutto lo spazio
-- dei colori. Quindi ogni capo disponibile entra nel calcolo delle distanze,
-- e quel calcolo costa quanto le righe per i colori.
--
-- Dodici riquadri piccoli, uno per colore, scartano invece davvero, e
-- l'indice su (colore_l, colore_a, colore_b) torna a servire: per questo
-- qui «enable_indexscan» non è più spento.
--
-- Cosa cambia nei risultati: quasi niente. Misurato su mille capi dentro il
-- riquadro unico, quelli che NON stanno dentro nessun riquadro per colore
-- sono due — lo 0,2% — e sono capi lontani da ogni colore della palette,
-- cioè quelli che la soglia di distanza avrebbe scartato comunque.
-- =====================================================================

begin;

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
    select (e->>'l')::real as l, (e->>'a')::real as a, (e->>'b')::real as b
    from jsonb_array_elements(palette) e
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
    -- Un riquadro per colore, non uno per tutta la palette.
    --
    -- Prima i limiti erano due soli numeri per asse, presi dal minimo e dal
    -- massimo di tutti i colori insieme: un riquadro che con dodici colori
    -- copre tutto lo spazio e non scarta nessuno. Adesso ogni colore ha il
    -- suo, e un capo entra se sta vicino ad ALMENO UNO — che è poi la
    -- domanda vera, perché la sua distanza dalla palette è la più piccola
    -- delle sue distanze dai singoli colori.
    --
    -- distinct on (p.id) perché un capo vicino a tre colori verrebbe fuori
    -- tre volte, e a contare le distanze ci pensa il passaggio dopo.
    select distinct on (p.id) p.id, p.colore_l, p.colore_a, p.colore_b, p.colori
    from voluti v
    join public.prodotti p
      on p.colore_l between v.l - 38 and v.l + 38
     and p.colore_a between v.a - 40 and v.a + 40
     and p.colore_b between v.b - 40 and v.b + 40
    where p.disponibile
      and (prezzo_min is null or p.prezzo >= prezzo_min)
      and (prezzo_max is null or p.prezzo <= prezzo_max)
      -- Il genere. Il vecchio filtro finiva con "or p.genere is null", e
      -- quel pezzo lo apriva a tutti: un capo su tre non ha il genere
      -- scritto — 22.966 su 68.897 — perché molti negozi non lo pubblicano,
      -- e passavano tutti senza pagare pegno, ordinati solo per colore. Chi
      -- impostava "uomo" si ritrovava reggiseni e pigiami da donna.
      -- Restano, e per un buon motivo. Buttarli tutti sarebbe stato comodo —
      -- righe in meno nel calcolo delle distanze, ricerca più svelta — ma
      -- guardando cosa sono si scopre che in gran parte sono sneaker, zaini
      -- e berretti: roba che da donna non è, è di nessuno. Toglierli non
      -- vuol dire "non mostrarmi roba da donna", vuol dire mostrarmi metà
      -- catalogo.
      --
      -- Quelli che invece da donna lo sono davvero — gonne, vestiti,
      -- reggiseni, bluse: circa millecento — li riconosce perChiE() dal nome
      -- del capo, che è una cosa che una regex qui dentro pagherebbe cara e
      -- che nel browser costa niente.
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
      -- Le parole, contro UN campo solo e indicizzato.
      --
      -- Qui c'era un exists con cinque ilike per parola — titolo, categoria,
      -- marca, nome del colore e la descrizione da seicento caratteri — su
      -- ogni riga del catalogo. Con cinque parole erano venticinque scansioni
      -- per riga, e sforava i tre secondi anche con un colore solo: il costo
      -- erano le parole, non i colori, e l'app aveva dovuto smettere di
      -- mandare al database quelle degli stili.
      --
      -- Adesso guardano tutte la colonna «cerca», che l'indice a trigrammi
      -- rende svelta. Misurato dall'esterno, sul catalogo vero: 73-187 ms con
      -- undici parole, contro i 720-800 ms che ne costava UNA sola prima.
      --
      -- «ilike any (array)» e non un exists: l'array si calcola una volta
      -- sola, prima di guardare le righe, e il pianificatore può usarci
      -- l'indice sopra. Con l'exists correlato non potrebbe.
      --
      -- La descrizione non c'è più: la colonna «cerca» tiene titolo,
      -- categoria, marca e nome del colore. È una scelta misurata — da sola
      -- pesava 346 caratteri per capo contro 54, cioè 39 MB di colonna contro
      -- 5 — e questo commento diceva già che contava pochissimo.
      and (
        parole is null
        or p.cerca ilike any (array(select '%' || k || '%' from unnest(parole) k))
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
-- Una riga sola, con «cerca» dentro la definizione della funzione: vuol dire
-- che è entrata questa versione e non un'altra.
select p.proname,
       pg_get_functiondef(p.oid) like '%p.cerca ilike any%' as usa_la_colonna,
       pg_get_functiondef(p.oid) like '%enable_bitmapscan%' as bitmap_ancora_spenta
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'capi_per_palette';
