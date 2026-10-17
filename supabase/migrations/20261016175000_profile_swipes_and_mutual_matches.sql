-- AppSwinger Supabase migration: persist safety-gated swipes and mutual matches.
-- Additive only; existing tables and production records are preserved.
create table if not exists public.profile_swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  swipe_type text not null check (swipe_type in ('like', 'pass', 'dislike', 'superlike')),
  created_at timestamptz not null default now(),
  constraint profile_swipes_not_self check (swiper_user_id <> target_user_id),
  constraint profile_swipes_unique_pair unique (swiper_user_id, target_user_id)
);

create index if not exists profile_swipes_target_type_idx
  on public.profile_swipes (target_user_id, swipe_type);
alter table public.profile_swipes enable row level security;

drop policy if exists profile_swipes_read_own on public.profile_swipes;
create policy profile_swipes_read_own on public.profile_swipes
  for select to authenticated using ((select auth.uid()) = swiper_user_id);

drop policy if exists profile_swipes_insert_verified on public.profile_swipes;
create policy profile_swipes_insert_verified on public.profile_swipes
  for insert to authenticated
  with check (
    swiper_user_id = (select auth.uid())
    and private.can_start_chat(swiper_user_id, target_user_id)
  );

drop policy if exists profile_swipes_update_own on public.profile_swipes;
create policy profile_swipes_update_own on public.profile_swipes
  for update to authenticated
  using ((select auth.uid()) = swiper_user_id)
  with check (
    (select auth.uid()) = swiper_user_id
    and private.can_start_chat(swiper_user_id, target_user_id)
  );

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint matches_distinct_users check (user_a < user_b),
  constraint matches_unique_pair unique (user_a, user_b)
);
create index if not exists matches_user_b_idx on public.matches (user_b, created_at desc);
alter table public.matches enable row level security;

drop policy if exists matches_read_participant on public.matches;
create policy matches_read_participant on public.matches
  for select to authenticated
  using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);

create or replace function public.record_mutual_match_from_swipe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.swipe_type in ('like', 'superlike')
     and exists (
       select 1 from public.profile_swipes reciprocal
       where reciprocal.swiper_user_id = new.target_user_id
         and reciprocal.target_user_id = new.swiper_user_id
         and reciprocal.swipe_type in ('like', 'superlike')
     )
     and private.can_start_chat(new.swiper_user_id, new.target_user_id)
  then
    insert into public.matches (user_a, user_b)
    values (least(new.swiper_user_id, new.target_user_id), greatest(new.swiper_user_id, new.target_user_id))
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.record_mutual_match_from_swipe() from public, anon, authenticated;
drop trigger if exists profile_swipes_record_mutual_match on public.profile_swipes;
create trigger profile_swipes_record_mutual_match
  after insert or update of swipe_type on public.profile_swipes
  for each row execute function public.record_mutual_match_from_swipe();

grant select, insert, update on public.profile_swipes to authenticated;
grant select on public.matches to authenticated;
