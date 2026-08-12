-- =====================================================================
-- Dress — inizializzazione database Supabase
-- Esegui questo file in Supabase → SQL Editor → New query → Run.
-- È idempotente: puoi rilanciarlo senza rompere nulla.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabella dei profili: una riga per utente registrato.
--    La chiave è l'id dell'utente in auth.users, NON l'email:
--    così il database stesso sa di chi è ogni riga.
--    "on delete cascade" = se l'utente cancella l'account, il profilo
--    sparisce automaticamente.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique,
  name          text,
  palette       jsonb,
  favorites     jsonb not null default '[]'::jsonb,
  saved_outfits jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Se la tabella esisteva già in una versione precedente, allinea le colonne.
alter table public.profiles add column if not exists palette       jsonb;
alter table public.profiles add column if not exists favorites     jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists saved_outfits jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists updated_at    timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 2. Row Level Security: ogni utente vede e modifica SOLO la sua riga.
--    Senza questo, chiunque abbia la chiave pubblica potrebbe leggere
--    i profili di tutti.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profili: leggi il tuo"      on public.profiles;
drop policy if exists "profili: crea il tuo"       on public.profiles;
drop policy if exists "profili: aggiorna il tuo"   on public.profiles;
drop policy if exists "profili: cancella il tuo"   on public.profiles;

create policy "profili: leggi il tuo"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profili: crea il tuo"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "profili: aggiorna il tuo"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "profili: cancella il tuo"
  on public.profiles for delete to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 3. Alla registrazione crea in automatico la riga del profilo.
--    Il nome arriva dai metadati passati da /api/auth/register.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. Tiene aggiornato updated_at a ogni modifica.
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
