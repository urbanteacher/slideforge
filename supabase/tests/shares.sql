-- Checks the share rules (0002, 0003, 0004) as each kind of caller: someone not signed in, a teacher, another
-- teacher, and a signed-in user outside the allowed domains. Paste it into the Supabase SQL editor and run it after
-- 0004_share_limits.sql. It changes nothing. Everything happens in one transaction that is rolled back at the end,
-- the stand-in users included.
--
-- It stops at the first rule that does not hold, saying which ("CHECK FAILED: …"). When every rule holds, it ends
-- with the notice "All share checks passed", and the transaction is then rolled back.

begin;

-- Stand-ins: two teachers at the first allowed domain, and someone at a domain that is not allowed.
do $$
declare dom text := (select domain from public.allowed_domains order by domain limit 1);
begin
  if dom is null then raise exception 'CHECK FAILED: public.allowed_domains is empty'; end if;
  insert into auth.users (id, aud, role, email, email_confirmed_at, instance_id)
  values ('00000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'check-a@' || dom, now(), '00000000-0000-0000-0000-000000000000'),
         ('00000000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'check-b@' || dom, now(), '00000000-0000-0000-0000-000000000000'),
         ('00000000-0000-4000-8000-00000000000c', 'authenticated', 'authenticated', 'check-c@not-a-school.example', now(), '00000000-0000-0000-0000-000000000000'),
         ('00000000-0000-4000-8000-00000000000d', 'authenticated', 'authenticated', 'check-d@' || dom, null, '00000000-0000-0000-0000-000000000000');
end $$;

-- Teacher A shares one open lesson and one private one, each with a picture.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
insert into public.shares (id, title, private, doc) values (repeat('a', 32), 'Open', false, '{"slides":[]}'), (repeat('b', 32), 'Private', true, '{"slides":[]}');
insert into public.share_pictures (share_id, n, data) values (repeat('a', 32), 0, 'data:image/png;base64,AA'), (repeat('b', 32), 0, 'data:image/png;base64,BB');

do $$ begin
  if not public.is_teacher() then raise exception 'CHECK FAILED: a confirmed teacher at an allowed domain is a teacher'; end if;
  -- Size and kind limits.
  begin insert into public.share_pictures (share_id, n, data) values (repeat('a', 32), 1, 'data:text/html,<script>1</script>');
        raise exception 'CHECK FAILED: a page was accepted as a picture';
  exception when check_violation then null; end;
  begin insert into public.shares (id, title, doc) values (repeat('c', 32), repeat('x', 201), '{}');
        raise exception 'CHECK FAILED: a 201-character title was accepted';
  exception when check_violation then null; end;
  begin insert into public.share_pictures (share_id, n, data) values (repeat('a', 32), 600, 'data:image/png;base64,AA');
        raise exception 'CHECK FAILED: picture 600 was accepted (0 to 599 only)';
  exception when check_violation then null; end;
end $$;

-- Teacher B: cannot see, change or add to A's shares, but opens both through get_share.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.shares) then raise exception 'CHECK FAILED: another teacher can list A''s shares'; end if;
  if exists (select 1 from public.share_pictures) then raise exception 'CHECK FAILED: another teacher can list A''s pictures'; end if;
  update public.shares set title = 'taken' where id = repeat('a', 32);
  if found then raise exception 'CHECK FAILED: another teacher changed A''s share'; end if;
  begin insert into public.share_pictures (share_id, n, data) values (repeat('a', 32), 5, 'data:image/png;base64,AA');
        raise exception 'CHECK FAILED: another teacher added a picture to A''s share';
  exception when insufficient_privilege then null; end;
  if (public.get_share(repeat('b', 32)) ->> 'doc') is null then raise exception 'CHECK FAILED: a teacher cannot open a private share'; end if;
  if public.get_share_picture(repeat('b', 32), 0) is null then raise exception 'CHECK FAILED: a teacher cannot see a private share''s picture'; end if;
end $$;

-- A signed-in user outside the allowed domains, and a teacher whose email is not confirmed: not teachers.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
do $$ begin
  if public.is_teacher() then raise exception 'CHECK FAILED: a user at another domain counts as a teacher'; end if;
  if (public.get_share(repeat('b', 32)) ->> 'doc') is not null then raise exception 'CHECK FAILED: a non-teacher opened a private share'; end if;
  if public.get_share_picture(repeat('b', 32), 0) is not null then raise exception 'CHECK FAILED: a non-teacher saw a private share''s picture'; end if;
  if (public.get_share(repeat('a', 32)) ->> 'doc') is null then raise exception 'CHECK FAILED: an open share would not open'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000d","role":"authenticated"}', true);
do $$ begin
  if public.is_teacher() then raise exception 'CHECK FAILED: an unconfirmed email counts as a teacher'; end if;
end $$;

-- Not signed in: an open share and its picture open; a private one says only that it is private; nothing is listed.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (public.get_share(repeat('a', 32)) ->> 'doc') is null then raise exception 'CHECK FAILED: an open share would not open signed out'; end if;
  if public.get_share_picture(repeat('a', 32), 0) is null then raise exception 'CHECK FAILED: an open share''s picture would not open signed out'; end if;
  if public.get_share(repeat('b', 32)) <> '{"private": true}'::jsonb then raise exception 'CHECK FAILED: a private share said more than that it is private'; end if;
  if public.get_share_picture(repeat('b', 32), 0) is not null then raise exception 'CHECK FAILED: a private share''s picture opened signed out'; end if;
  begin
    if exists (select 1 from public.shares) then raise exception 'CHECK FAILED: shares can be listed signed out'; end if;
  exception when insufficient_privilege then null; -- refused outright: as good as nothing listed
  end;
  raise notice 'All share checks passed';
end $$;

rollback;
