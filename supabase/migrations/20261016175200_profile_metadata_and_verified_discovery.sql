-- Safe profile metadata and verified-only discovery RPC for AppSwinger.
alter table public.profiles
  add column if not exists profile_kind text not null default 'Individual',
  add column if not exists bio text not null default '',
  add column if not exists city text,
  add column if not exists country_code char(2) not null default 'MX',
  add column if not exists interests text[] not null default '{}',
  add column if not exists seeking text[] not null default '{}',
  add column if not exists preferred_age_ranges text[] not null default '{}',
  add column if not exists max_distance_km integer not null default 30;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='profiles_profile_kind_check') then
    alter table public.profiles add constraint profiles_profile_kind_check
      check (profile_kind in ('Pareja','Dama','Caballero','Individual'));
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_bio_length_check') then
    alter table public.profiles add constraint profiles_bio_length_check
      check (char_length(bio) <= 1200);
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_country_code_check') then
    alter table public.profiles add constraint profiles_country_code_check
      check (country_code in ('MX','US'));
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_max_distance_km_check') then
    alter table public.profiles add constraint profiles_max_distance_km_check
      check (max_distance_km between 1 and 500);
  end if;
end $$;

create or replace function public.discover_verified_profiles(p_limit integer default 30)
returns table (
  profile_id uuid,
  display_name text,
  profile_kind text,
  bio text,
  city text,
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
  select p.id, p.display_name, p.profile_kind, p.bio, p.city, p.country_code::text,
         p.interests, p.seeking,
         date_part('year', age(current_date, p.birth_date))::integer,
         p.profile_photo_path, p.created_at
  from public.profiles p
  where (select auth.uid()) is not null
    and p.id <> (select auth.uid())
    and p.status = 'active'
    and p.age_verified_at is not null
    and p.identity_verified_at is not null
    and p.profile_photo_match_status = 'matched'
    and p.profile_photo_path is not null
    and private.can_start_chat((select auth.uid()), p.id)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;

revoke all on function public.discover_verified_profiles(integer) from public, anon;
grant execute on function public.discover_verified_profiles(integer) to authenticated;

drop policy if exists "Swingers verified users read discoverable profile photos" on storage.objects;
create policy "Swingers verified users read discoverable profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1
      from public.profiles p
      where p.profile_photo_path = storage.objects.name
        and p.status = 'active'
        and p.age_verified_at is not null
        and p.identity_verified_at is not null
        and p.profile_photo_match_status = 'matched'
        and private.can_start_chat((select auth.uid()), p.id)
    )
  );
