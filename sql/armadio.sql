-- L'armadio: i capi che una persona possiede già.
--
-- Il catalogo dice cosa si può comprare. Questo dice cosa si ha. È la
-- differenza fra «guarda che bel cappotto» e «con quel cappotto che hai già,
-- mettici questi pantaloni» — e la seconda è la risposta che serve la mattina.
--
-- A differenza del catalogo, qui dentro ci sono cose di persone: le foto dei
-- loro vestiti, le note che si scrivono. Quindi ogni riga appartiene a
-- qualcuno e nessun altro la vede, nemmeno per sbaglio.
create table if not exists public.armadio (
  id          bigserial primary key,
  utente      uuid not null references auth.users(id) on delete cascade,

  titolo      text not null,
  ruolo       text,                    -- capospalla | top | intero | bottom | scarpe | accessorio
  categoria   text,
  note        text,

  -- Il colore nelle stesse tre coordinate del catalogo: è quello che permette
  -- di dire «questa camicia sta bene con quel cappotto» usando lo stesso
  -- metro per una cosa comprata e una cosa già in camera.
  colore_hex  text,
  colore_l    real,
  colore_a    real,
  colore_b    real,
  colore_nome text,

  -- La foto sta in Supabase Storage, qui c'è solo dove trovarla: una riga di
  -- database con dentro mezzo megabyte di immagine si paga a ogni lettura.
  foto        text,

  -- Quante volte se l'è messo, e l'ultima. Serve a dire, un giorno, «questo
  -- non lo metti da otto mesi» — che è l'unica cosa onesta che un armadio
  -- possa dire a chi continua a comprare.
  volte       integer not null default 0,
  ultima      timestamptz,

  creato      timestamptz not null default now(),
  aggiornato  timestamptz not null default now()
);

create index if not exists armadio_utente on public.armadio (utente);
create index if not exists armadio_ruolo  on public.armadio (utente, ruolo);

-- Ogni riga è di chi l'ha messa, e di nessun altro.
--
-- Quattro regole invece di una sola «vedi il tuo»: leggere, scrivere,
-- modificare e cancellare sono quattro permessi diversi, e scriverli tutti
-- e quattro impedisce che uno si dimentichi di esistere. Il difetto di
-- Postgres è che senza regola non si passa — quindi una regola mancante si
-- vede subito, ed è il verso giusto in cui sbagliare.
alter table public.armadio enable row level security;

drop policy if exists "armadio: leggi il tuo"      on public.armadio;
drop policy if exists "armadio: aggiungi al tuo"   on public.armadio;
drop policy if exists "armadio: modifica il tuo"   on public.armadio;
drop policy if exists "armadio: togli dal tuo"     on public.armadio;

create policy "armadio: leggi il tuo"
  on public.armadio for select
  to authenticated
  using (auth.uid() = utente);

create policy "armadio: aggiungi al tuo"
  on public.armadio for insert
  to authenticated
  with check (auth.uid() = utente);

create policy "armadio: modifica il tuo"
  on public.armadio for update
  to authenticated
  using (auth.uid() = utente)
  with check (auth.uid() = utente);

create policy "armadio: togli dal tuo"
  on public.armadio for delete
  to authenticated
  using (auth.uid() = utente);

drop trigger if exists armadio_touch on public.armadio;
create trigger armadio_touch
  before update on public.armadio
  for each row execute function public.touch_aggiornato();

-- ── Le foto ───────────────────────────────────────────────────────────────
--
-- Un secchio non pubblico: le foto dei vestiti di casa non stanno su un
-- indirizzo che chiunque indovina. Si leggono solo con il permesso di chi le
-- ha caricate, e i link si firmano al momento.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('armadio', 'armadio', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ognuno nella sua cartella, che si chiama come lui.
--
-- «(storage.foldername(name))[1]» è il primo pezzo del percorso: se il file
-- è «<id utente>/camicia.jpg», quel pezzo è l'id. Confrontarlo con chi sta
-- chiedendo è tutto il controllo che serve, e non si può aggirare scegliendo
-- un nome di file furbo.
drop policy if exists "armadio foto: leggi le tue"    on storage.objects;
drop policy if exists "armadio foto: carica le tue"   on storage.objects;
drop policy if exists "armadio foto: cancella le tue" on storage.objects;

create policy "armadio foto: leggi le tue"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'armadio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "armadio foto: carica le tue"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'armadio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "armadio foto: cancella le tue"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'armadio' and (storage.foldername(name))[1] = auth.uid()::text);
