-- A shared lesson's pictures, apart from the lesson (BACKLOG CS-14, step 2; after 0002_shares.sql).
--
-- A Lesson-studio share made by a signed-in teacher keeps each picture as a row of its own, so the lesson's words
-- and every picture travel in requests of their own and a share is no longer held to the size of one request.
-- They follow their share: deleted with it, and readable only by whoever may open it, through get_share_picture(),
-- so a private share's pictures are as private as the share. Nobody can list them.
--
-- Run once in the Supabase project's SQL editor. Safe to run again.

create table if not exists public.share_pictures (
  share_id text not null references public.shares (id) on delete cascade,
  n integer not null check (n >= 0 and n < 600),
  data text not null check (data like 'data:%'),
  primary key (share_id, n)
);

alter table public.share_pictures enable row level security;

-- The teacher who made a share adds and removes its pictures, and no one else.
drop policy if exists "teachers manage their own shares' pictures" on public.share_pictures;
create policy "teachers manage their own shares' pictures" on public.share_pictures
  for all
  using (public.is_teacher() and exists (select 1 from public.shares s where s.id = share_id and s.owner = auth.uid()))
  with check (public.is_teacher() and exists (select 1 from public.shares s where s.id = share_id and s.owner = auth.uid()));

-- One picture of a share, for whoever may open the share (get_share's rule): null for anyone else, or when there is
-- no such picture.
create or replace function public.get_share_picture(share_id text, n integer) returns text
  language sql stable security definer set search_path = public as $$
  select p.data
  from public.share_pictures p
  join public.shares s on s.id = p.share_id
  where p.share_id = get_share_picture.share_id and p.n = get_share_picture.n
    and (not s.private or public.is_teacher());
$$;
revoke all on function public.get_share_picture(text, integer) from public;
grant execute on function public.get_share_picture(text, integer) to anon, authenticated;
