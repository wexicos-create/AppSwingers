-- Re-apply the verification and two-way block gate consistently on writes and matches.
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
