-- Mexico-only locality and provider-backed Didit identity verification.
alter table public.profiles
  add column if not exists state text,
  add column if not exists identity_verification_status text not null default 'not_started',
  add column if not exists face_match_status text not null default 'pending';

-- Existing experience proposals are retained; each record now belongs to a Mexican state/city.
alter table public.experience_proposals
  add column if not exists state text,
  add column if not exists country_code char(2) not null default 'MX';
alter table public.experience_proposals drop constraint if exists experience_proposals_country_code_check;
alter table public.experience_proposals add constraint experience_proposals_country_code_check check (country_code = 'MX');

alter table public.profiles drop constraint if exists profiles_country_code_check;
alter table public.profiles add constraint profiles_country_code_check check (country_code = 'MX');
alter table public.profiles drop constraint if exists profiles_identity_verification_status_check;
alter table public.profiles add constraint profiles_identity_verification_status_check
  check (identity_verification_status in ('not_started','pending','verified','rejected'));
alter table public.profiles drop constraint if exists profiles_face_match_status_check;
alter table public.profiles add constraint profiles_face_match_status_check
  check (face_match_status in ('pending','matched','rejected'));

-- Reuse the existing identity_verifications table; only provider outcome metadata is stored.
create index if not exists identity_verifications_provider_session_idx on public.identity_verifications(provider_session_id);
alter table public.identity_verifications enable row level security;
drop policy if exists "Users read own identity status" on public.identity_verifications;
create policy "Users read own identity status" on public.identity_verifications
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.identity_verifications from anon, authenticated;
grant select on public.identity_verifications to authenticated;


-- Recreate the RPC to include state and isolate discovery to the signed-in user's state.
drop function if exists public.discover_verified_profiles(integer);
create function public.discover_verified_profiles(p_limit integer default 30)
returns table (
  profile_id uuid,
  display_name text,
  profile_kind text,
  bio text,
  city text,
  state text,
  country_code text,
  interests text[],
  seeking text[],
  age integer,
  profile_photo_path text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.profile_kind, p.bio, p.city, p.state, 'MX'::text,
         p.interests, p.seeking,
         date_part('year', age(current_date, p.birth_date))::integer,
         p.profile_photo_path, p.created_at
  from public.profiles p
  join public.profiles me on me.id = (select auth.uid())
  where (select auth.uid()) is not null
    and p.id <> (select auth.uid())
    and p.country_code = 'MX'
    and p.state is not null
    and p.state = me.state
    and p.status = 'active'
    and p.age_verified_at is not null
    and p.identity_verified_at is not null
    and p.face_match_status = 'matched'
    and p.profile_photo_match_status = 'matched'
    and p.profile_photo_path is not null
    and private.can_start_chat((select auth.uid()), p.id)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;
revoke all on function public.discover_verified_profiles(integer) from public, anon;
grant execute on function public.discover_verified_profiles(integer) to authenticated;
