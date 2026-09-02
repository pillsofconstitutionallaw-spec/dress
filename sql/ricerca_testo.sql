-- =====================================================================
-- Un indice per cercare le parole nei capi.
--
-- Da incollare nell'editor SQL di Supabase. È il PRIMO di due passi, ed è
-- fatto apposta per non poter rompere niente: aggiunge una colonna e un
-- indice, e nessuno dei due viene ancora usato da nessuna query. Se dopo
-- averlo lanciato l'app si comporta diversamente, non è stato questo file.
--
-- Il secondo passo — riscrivere il filtro delle parole dentro
-- capi_per_palette perché usi l'indice — arriva dopo, quando avremo
-- misurato che l'indice serve davvero. Un file che cambia una funzione viva
-- si incolla dopo aver visto i numeri, non prima.
--
-- ── perché serve ─────────────────────────────────────────────────────
--
-- Il filtro delle parole in capi_per_palette confronta ogni parola con
-- cinque campi di ogni riga, con ilike '%parola%', su settantottomila righe
-- disponibili. Con cinque parole sono venticinque scansioni per riga, e la
-- ricerca sfora i tre secondi che il database concede — anche con UN colore
-- solo, perché il costo sono le parole e non i colori.
--
-- Per questo l'app ha smesso di mandare al database le parole degli stili e
-- se le filtra in casa, sulle righe già scaricate. Funziona, ma pesca da
-- quello che il colore ha già scremato: uno stile di nicchia come
-- «Romantico» dà dieci capi invece di ventiquattro. L'indice serve a
-- rimettere quel filtro dov'era, senza pagarlo.
--
-- ── la descrizione resta fuori, ed è una scelta ──────────────────────
--
-- Misurato sul catalogo vero, per capo: titolo 35 caratteri, categoria 8,
-- marca 9, nome del colore 2 — e descrizione 346. Mettendola dentro, la
-- colonna passa da 5 MB a 39, e l'indice cresce in proporzione.
--
-- E vale poco: il commento dentro capi_per_palette lo dice già di suo — «la
-- descrizione entra qui e basta, e conta pochissimo». Chi cerca "camicia"
-- vuole i capi che si CHIAMANO camicia, non quelli che la nominano nella
-- scheda. Se un giorno servirà, si aggiunge: la colonna si rifà da sé.
-- =====================================================================

-- I trigrammi: è l'estensione che rende indicizzabile ilike '%parola%'.
-- Senza, un indice normale serve solo a chi cerca dall'inizio della parola.
create extension if not exists pg_trgm;

-- Un solo campo con dentro tutto quello su cui si cerca, già in minuscolo.
-- Generata e mantenuta dal database: non c'è codice da ricordarsi di
-- aggiornare, e l'importazione non cambia di una riga.
--
-- Attenzione: aggiungere una colonna generata riscrive la tabella. Su
-- centomila righe sono secondi, non minuti, ma la tabella resta bloccata in
-- scrittura per quel tempo: meglio lanciarlo quando l'importazione notturna
-- non sta girando.
alter table public.prodotti
  add column if not exists cerca text
  generated always as (
    lower(
      coalesce(titolo, '') || ' ' ||
      coalesce(categoria, '') || ' ' ||
      coalesce(marca, '') || ' ' ||
      coalesce(colore_nome, '')
    )
  ) stored;

-- CONCURRENTLY: costruire l'indice non blocca chi sta cercando. Per questo
-- il file non ha begin/commit — un indice concorrente non si può creare
-- dentro una transazione, e PostgreSQL rifiuterebbe.
create index concurrently if not exists prodotti_cerca_trgm
  on public.prodotti using gin (cerca gin_trgm_ops);

-- E gli conviene sapere com'è fatta la tabella adesso. Oggi ci sono passate
-- trentamila righe di correzioni — genere, punteggio del tessuto, colore — e
-- dopo una scrittura di massa le statistiche del pianificatore sono vecchie:
-- sceglie i piani sui numeri di ieri.
analyze public.prodotti;

-- ── la verifica ──────────────────────────────────────────────────────
-- Devono uscire: la colonna cerca con generated = ALWAYS, e l'indice
-- prodotti_cerca_trgm valido. Un indice invalid = true vuol dire che la
-- creazione concorrente è fallita a metà: si butta e si rifà.
select column_name, is_generated
from information_schema.columns
where table_name = 'prodotti' and column_name = 'cerca';

select i.relname as indice, idx.indisvalid as valido,
       pg_size_pretty(pg_relation_size(i.oid)) as dimensione
from pg_class i
join pg_index idx on idx.indexrelid = i.oid
where i.relname = 'prodotti_cerca_trgm';
