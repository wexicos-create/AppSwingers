-- Safe match-card RPC and a conversation record for every verified mutual match.
alter table public.matches
  add column if not exists conversation_id uuid references public.chat_conversations(id) on delete set null;

create unique index if not exists chat_conversations_participant_pair_unique
  on public.chat_conversations (
    least(participant_a, participant_b),
    greatest(participant_a, participant_b)
  );

create or replace function public.record_mutual_match_from_swipe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
begin
  if new.swipe_type not in ('like', 'superlike')
     or not exists (
       select 1 from public.profile_swipes reciprocal
       where reciprocal.swiper_user_id = new.target_user_id
         and reciprocal.target_user_id = new.swiper_user_id
         and reciprocal.swipe_type in ('like', 'superlike')
     )
     or not private.can_start_chat(new.swiper_user_id, new.target_user_id)
  then
    return new;
  end if;

  v_user_a := least(new.swiper_user_id, new.target_user_id);
  v_user_b := greatest(new.swiper_user_id, new.target_user_id);

  if exists (select 1 from public.matches m where m.user_a = v_user_a and m.user_b = v_user_b) then
    return new;
  end if;

  insert into public.chat_conversations (participant_a, participant_b, conversation_type, status)
  values (v_user_a, v_user_b, 'dating', 'active')
  on conflict do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select c.id into v_conversation_id
    from public.chat_conversations c
    where least(c.participant_a, c.participant_b) = v_user_a
      and greatest(c.participant_a, c.participant_b) = v_user_b
    limit 1;
  end if;

  insert into public.matches (user_a, user_b, conversation_id)
  values (v_user_a, v_user_b, v_conversation_id)
  on conflict (user_a, user_b) do nothing;
  return new;
end;
$$;
revoke all on function public.record_mutual_match_from_swipe() from public, anon, authenticated;

create or replace function public.my_verified_matches(p_limit integer default 30)
returns table (
  match_id uuid,
  matched_at timestamptz,
  profile_id uuid,
  display_name text,
  profile_kind text,
  bio text,
  city text,
  country_code text,
  interests text[],
  age integer,
  profile_photo_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.created_at, p.id, p.display_name, p.profile_kind, p.bio,
         p.city, p.country_code::text, p.interests,
         date_part('year', age(current_date, p.birth_date))::integer,
         p.profile_photo_path
  from public.matches m
  join public.profiles p
    on p.id = case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
  where (m.user_a = (select auth.uid()) or m.user_b = (select auth.uid()))
    and (select auth.uid()) is not null
    and p.status = 'active'
    and p.age_verified_at is not null
    and p.identity_verified_at is not null
    and p.profile_photo_match_status = 'matched'
    and p.profile_photo_path is not null
    and private.can_start_chat((select auth.uid()), p.id)
  order by m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;

revoke all on function public.my_verified_matches(integer) from public, anon;
grant execute on function public.my_verified_matches(integer) to authenticated;
