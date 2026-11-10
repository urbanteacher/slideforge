-- Limits and tightened rules for shares and their pictures (docs/cs-review-fixes.md, CR-53 to CR-55; after 0003).
--
-- 1. Who counts as a teacher is read from the account itself, not only from what the sign-in token says. The email
--    must be confirmed, and its domain must be exactly an allowed one. A token's email claim is trusted only while
--    every sign-in proves the address (magic links do). Turning on password sign-up without "Confirm email" would
--    otherwise let anyone register an address at an allowed domain. The domain is now compared as a whole, not with
--    LIKE, where an "_" in a domain would match any character.
-- 2. Size limits the database keeps, whoever writes to it:
--    - a shared lesson's words, up to 8 MB;
--    - its title, up to 200 characters;
--    - each picture, up to 8 MB, and only a picture, a video or a sound, never a page.
--    Rows already there are not checked (NOT VALID); new ones are.
-- 3. The policies done the way Supabase advises: for signed-in users only (TO authenticated), with auth.uid() and
--    is_teacher() worked out once per statement rather than once per row ((select …)). The functions keep an empty
--    search_path and name every table in full.
--
-- Run once in the Supabase project's SQL editor. Safe to run again. supabase/tests/shares.sql then checks the rules.

-- ---------------------------------------------------------------- who counts as a teacher
create or replace function public.is_teacher() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.allowed_domains d on d.domain = split_part(lower(u.email), '@', 2)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
-- Called from the policies below (as the signed-in user) and from get_share (as its owner); nobody asks it directly.
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

-- ---------------------------------------------------------------- size limits
alter table public.shares drop constraint if exists shares_doc_size;
alter table public.shares add constraint shares_doc_size check (octet_length(doc::text) <= 8000000) not valid;
alter table public.shares drop constraint if exists shares_title_length;
alter table public.shares add constraint shares_title_length check (char_length(title) <= 200) not valid;

alter table public.share_pictures drop constraint if exists share_pictures_media;
alter table public.share_pictures add constraint share_pictures_media
  check (data ~ '^data:(image|video|audio)/[a-z0-9.+-]+' and octet_length(data) <= 8000000) not valid;

-- ---------------------------------------------------------------- the policies, once per statement
do $$
declare t text;
begin
  foreach t in array array['documents', 'folders', 'assets'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
      using (owner = (select auth.uid()) and (select public.is_teacher()))
      with check (owner = (select auth.uid()) and (select public.is_teacher()))', t);
  end loop;
end $$;

drop policy if exists "own media" on storage.objects;
create policy "own media" on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_teacher()))
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_teacher()));

drop policy if exists "teachers manage their own shares" on public.shares;
create policy "teachers manage their own shares" on public.shares
  for all to authenticated
  using (owner = (select auth.uid()) and (select public.is_teacher()))
  with check (owner = (select auth.uid()) and (select public.is_teacher()));

drop policy if exists "teachers manage their own shares' pictures" on public.share_pictures;
create policy "teachers manage their own shares' pictures" on public.share_pictures
  for all to authenticated
  using ((select public.is_teacher()) and exists (
    select 1 from public.shares s where s.id = share_pictures.share_id and s.owner = (select auth.uid())))
  with check ((select public.is_teacher()) and exists (
    select 1 from public.shares s where s.id = share_pictures.share_id and s.owner = (select auth.uid())));

-- ---------------------------------------------------------------- opening a link, as before, with an empty search_path
create or replace function public.get_share(share_id text) returns jsonb
  language sql stable security definer set search_path = '' as $$
  select case
    when s.private and not public.is_teacher() then jsonb_build_object('private', true)
    else jsonb_build_object('private', s.private, 'title', s.title, 'doc', s.doc)
  end
  from public.shares s
  where s.id = get_share.share_id;
$$;
revoke all on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;

create or replace function public.get_share_picture(share_id text, n integer) returns text
  language sql stable security definer set search_path = '' as $$
  select p.data
  from public.share_pictures p
  join public.shares s on s.id = p.share_id
  where p.share_id = get_share_picture.share_id and p.n = get_share_picture.n
    and (not s.private or public.is_teacher());
$$;
revoke all on function public.get_share_picture(text, integer) from public;
grant execute on function public.get_share_picture(text, integer) to anon, authenticated;
