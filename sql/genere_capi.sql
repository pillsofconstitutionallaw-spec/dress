-- Rimette il genere ai capi che ce l'hanno scritto in faccia.
--
-- Da lanciare UNA VOLTA nell'editor SQL di Supabase. Non serve all'app per
-- funzionare — il filtro nuovo legge già il titolo a ogni ricerca — ma
-- sistemare il dato alla radice è meglio che rimediare a ogni interrogazione,
-- e rende giuste anche le vecchie query che qui non passano.
--
-- Perché serviva. Il genere di un capo veniva dal valore predefinito del
-- negozio, e il singolo capo poteva smentirlo solo con otto parole, tutte
-- singolari, tutte italiane o inglesi. Così:
--
--   "Dames 1-pack Triangle top"  → l'olandese non era previsto, e il negozio
--                                  (Muchachomalo) dice "uomo": un reggiseno
--                                  schedato da uomo;
--   "Mens Midweight T-Shirt"     → \muomo\M non aggancia "mens": niente;
--   "Sneaker - Kid unisex"       → i bambini non erano previsti: niente.

begin;

-- I bambini per primi: qualunque altra parola nel titolo, se c'è scritto
-- "kid" o "baby" quel capo non è di un adulto.
update public.prodotti
   set genere = 'bambino'
 where titolo ~* '\m(bambin[oaie]|bimb[oaie]|kids?|infant|toddler|junior|girls?|boys?|neonat[oi]|newborn)\M|\mbab(y|ies)\M(?!\s*(blue|blu|pink|rosa|tee|doll|girl))'
   and coalesce(genere,'') <> 'bambino';

-- Poi donna e uomo, ma solo quando il titolo lo dice ed è l'unico dei due a
-- dirlo: dove compaiono entrambe le parole il capo è unisex, e dove non
-- compare nessuna si lascia stare quello che c'è.
update public.prodotti
   set genere = 'donna'
 where genere is distinct from 'bambino'
   and titolo ~* '\m(donn[ae]|femminile|wom[ae]n|womens|lad(y|ies)|dames|femmes?|mujer|damen)\M'
   and titolo !~* '\m(uomo|uomini|maschile|m[ae]n|mens|heren|hommes?|hombre|herren)\M'
   and coalesce(genere,'') <> 'donna';

update public.prodotti
   set genere = 'uomo'
 where genere is distinct from 'bambino'
   and titolo ~* '\m(uomo|uomini|maschile|m[ae]n|mens|heren|hommes?|hombre|herren)\M'
   and titolo !~* '\m(donn[ae]|femminile|wom[ae]n|womens|lad(y|ies)|dames|femmes?|mujer|damen)\M'
   and coalesce(genere,'') <> 'uomo';

commit;

-- Come è andata:
--   select coalesce(genere,'(vuoto)') as genere, count(*)
--     from public.prodotti where disponibile group by 1 order by 2 desc;
