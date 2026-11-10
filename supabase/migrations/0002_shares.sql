-- Shared lessons online (BACKLOG CS-06; docs/data-storage-plan.md, step 6, for the Lesson studio's shares).
--
-- A share made by a signed-in teacher is kept here rather than on the relay's disk, so it survives an app update.
-- It is either open (anyone with the link, as before) or private (only a signed-in teacher at an allowed domain).
-- Nobody can list the shares: an open one is read by its id through get_share(), the way the relay's
-- /api/share/<id> works, so a share's address stays something nobody can guess.
--
-- Run once in the Supabase project's SQL editor, after 0001_lessons.sql. Safe to run again.

create table if not exists public.shares (
  id text primary key check (id ~ '^[a-f0-9]{32}$'),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  private boolean not null default false,
  created timestamptz not null default now(),
  doc jsonb not null
);
create index if not exists shares_owner on public.shares (owner, created desc);

alter table public.shares enable row level security;

-- A teacher makes, lists and withdraws their own shares, and no one else's.
drop policy if exists "teachers manage their own shares" on public.shares;
create policy "teachers manage their own shares" on public.shares
  for all
  using (owner = auth.uid() and public.is_teacher())
  with check (owner = auth.uid() and public.is_teacher());

-- Opening a link. Null when there is no such share. A private share asked for by anyone but a signed-in teacher
-- answers only that it is private, so the viewer can say "sign in", and never hands over the lesson.
create or replace function public.get_share(share_id text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select case
    when s.private and not public.is_teacher() then jsonb_build_object('private', true)
    else jsonb_build_object('private', s.private, 'title', s.title, 'doc', s.doc)
  end
  from public.shares s
  where s.id = share_id;
$$;
revoke all on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;
