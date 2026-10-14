-- Saving lessons online (docs/data-storage-plan.md, step 2): the tables, the pictures bucket, and who may touch what.
--
-- Teachers only, signing in with an email magic link (plan §8, decided 14 Oct 2026). Every row belongs to the
-- teacher who wrote it (`owner`, their auth user id), and Row Level Security lets a teacher read and write only
-- their own. A signed-in user whose email is not at an allowed domain can do nothing at all: `is_teacher()`.
--
-- Run once in the Supabase project's SQL editor (or `supabase db push`). Safe to run again.

-- ---------------------------------------------------------------- who counts as a teacher
create table if not exists public.allowed_domains (
  domain text primary key check (domain = lower(domain) and domain !~ '@')
);
insert into public.allowed_domains (domain) values ('nulondon.ac.uk') on conflict do nothing;
alter table public.allowed_domains enable row level security;
-- Readable by anyone (it is the sign-in page's own rule, and the weekly keep-alive reads it); written only from the
-- dashboard, by the project's owner.
drop policy if exists "domains are readable" on public.allowed_domains;
create policy "domains are readable" on public.allowed_domains for select using (true);

create or replace function public.is_teacher() returns boolean
  language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.allowed_domains d
    where lower(coalesce(auth.jwt() ->> 'email', '')) like '%@' || d.domain
  );
$$;

-- ---------------------------------------------------------------- lessons, games and classic decks
-- One table for every kind (plan §5.2): `kind` is 'lesson' (a Lesson studio deck), 'classic' or 'game', as SF.Docs
-- lists them (js/docs.js). `body` is the document itself; pictures move to the bucket in step 5.
create table if not exists public.documents (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('lesson', 'classic', 'game')),
  title text not null default '',
  folder text not null default '',
  modified timestamptz not null default now(),
  deleted boolean not null default false,
  body jsonb not null,
  primary key (owner, id)
);
create index if not exists documents_modified on public.documents (owner, modified desc);

-- The Library's folders.
create table if not exists public.folders (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  sort integer not null default 0,
  primary key (owner, id)
);

-- Pictures and videos, de-duplicated by content hash (plan §5.3): the file is in the `media` bucket at `path`.
create table if not exists public.assets (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  path text not null,
  bytes bigint not null check (bytes >= 0),
  type text not null,
  created timestamptz not null default now(),
  primary key (owner, hash)
);

-- ---------------------------------------------------------------- each teacher's rows are theirs alone
do $$
declare t text;
begin
  foreach t in array array['documents', 'folders', 'assets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
      using (owner = auth.uid() and public.is_teacher())
      with check (owner = auth.uid() and public.is_teacher())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- the pictures bucket
-- Private: a picture is read through a signed URL or by its owner, never by guessing a public link. Each teacher's
-- files live under a folder named by their user id.
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;

drop policy if exists "own media" on storage.objects;
create policy "own media" on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher())
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher());
