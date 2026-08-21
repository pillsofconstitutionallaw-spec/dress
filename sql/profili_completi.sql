-- =====================================================================
-- Dress — le colonne che il codice scrive e la tabella non aveva
-- Esegui in Supabase → SQL Editor → New query → Run.
-- Idempotente: puoi rilanciarlo senza rompere nulla.
--
-- supabase_init.sql creava "profiles" con id, email, name, palette,
-- favorites e saved_outfits. Ma il codice ne scrive altre sei, e nessuno
-- controllava l'esito: le scritture fallivano in silenzio.
--
--   username, cognome, data_nascita, avatar  → /api/auth/register
--   dati                                     → /api/profile/save (questionario)
--   capi_preferiti                           → /api/preferiti
--
-- Conseguenza in atto: il controllo "nome utente già preso" non è mai
-- scattato (la select falliva, il codice proseguiva come se fosse libero),
-- e i dati del profilo sopravvivevano solo in auth.users.raw_user_meta_data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Le colonne mancanti.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists username       text;
alter table public.profiles add column if not exists cognome        text;
alter table public.profiles add column if not exists data_nascita   date;
alter table public.profiles add column if not exists avatar         text;
alter table public.profiles add column if not exists dati           jsonb;
alter table public.profiles add column if not exists capi_preferiti jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------
-- 2. Unicità del nome utente, garantita dal database.
--
--    Finora l'unicità la doveva garantire una select in /api/auth/register.
--    Una select può fallire, può arrivare tardi, e fra il controllo e la
--    scrittura c'è sempre una fessura in cui due iscrizioni simultanee
--    passano tutte e due. L'indice non ha fessure.
--
--    Case-insensitive: "Marco" e "marco" sono la stessa persona per
--    chiunque legga, e devono esserlo anche qui.
--    Parziale: chi non ha ancora un nome utente (i profili creati prima,
--    e chi entra con Google prima di completare) resta NULL senza che i
--    NULL collidano fra loro.
-- ---------------------------------------------------------------------
create unique index if not exists profiles_username_unico
  on public.profiles (lower(username))
  where username is not null;

-- ---------------------------------------------------------------------
-- 3. Il trigger di creazione copia anche quello che arriva da Google.
--
--    Con l'accesso Google i metadati li scrive Supabase, non la nostra
--    /api/auth/register: name, full_name e avatar_url arrivano da lì.
--    Senza questo, chi entra con Google avrebbe un profilo con la sola
--    email e dovrebbe riscrivere il nome che Google ha già dato.
--
--    "coalesce" perché i due mondi usano nomi diversi per la stessa cosa:
--    l'iscrizione classica manda "name" e "avatar", Google "full_name" e
--    "avatar_url".
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, cognome, username, data_nascita, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'cognome',
    new.raw_user_meta_data->>'username',
    -- Una data vuota o malformata non deve impedire la creazione del
    -- profilo: l'utente esiste comunque, la data si chiede dopo.
    (nullif(new.raw_user_meta_data->>'data_nascita', ''))::date,
    coalesce(new.raw_user_meta_data->>'avatar', new.raw_user_meta_data->>'avatar_url')
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Se il profilo non si crea, l'utente deve nascere lo stesso:
    -- un trigger che esplode qui annullerebbe l'intera iscrizione.
    -- Il profilo verrà creato dall'upsert della prima scrittura.
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
