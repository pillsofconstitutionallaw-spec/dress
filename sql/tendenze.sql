-- Cosa si porta adesso, misurato sul catalogo invece che indovinato.
-- I negozi comprano quello che vende: contare i tagli nei loro cataloghi è
-- il modo più onesto che abbiamo di sapere cosa va, senza chiederlo a un
-- modello che si ferma alla sua data di addestramento.
create or replace function public.tendenze_tagli()
returns table (taglio text, quanti bigint)
language sql
stable
as $$
  with vocabolario(taglio, chiavi) as (values
    ('Baggy',            array['%baggy%']),
    ('Gamba larga',      array['%wide leg%','%gamba larga%','%palazzo%']),
    ('Cargo',            array['%cargo%']),
    ('Oversize',         array['%oversize%']),
    ('Crop',             array['%crop%']),
    ('Vita alta',        array['%vita alta%','%high waist%']),
    ('Flare / zampa',    array['%flare%','%zampa%']),
    ('Dritto',           array['%dritt%','%straight%']),
    ('Slim',             array['%slim%']),
    ('Mom',              array['%mom %']),
    ('Barrel',           array['%barrel%']),
    ('Bootcut',          array['%bootcut%']),
    ('Skinny',           array['%skinny%']),
    ('Boyfriend',        array['%boyfriend%'])
  )
  select v.taglio, count(p.id) as quanti
  from vocabolario v
  left join public.prodotti p
    on p.disponibile and exists (select 1 from unnest(v.chiavi) k where p.titolo ilike k)
  group by v.taglio
  having count(p.id) > 0
  order by quanti desc;
$$;

grant execute on function public.tendenze_tagli() to anon, authenticated;
