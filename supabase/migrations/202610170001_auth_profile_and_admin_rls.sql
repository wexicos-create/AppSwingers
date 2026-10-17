-- AppSwinger: secure profile bootstrap and role boundaries.
-- Review against existing policies before applying to an environment with production data.
begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_appswinger on auth.users;
create trigger on_auth_user_created_appswinger
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_update_own_safe_fields" on public.profiles;
create policy "profiles_update_own_safe_fields" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and status in ('pending', 'active', 'suspended', 'banned')
  and identity_verified_at is not distinct from (
    select p.identity_verified_at from public.profiles p where p.id = (select auth.uid())
  )
  and age_verified_at is not distinct from (
    select p.age_verified_at from public.profiles p where p.id = (select auth.uid())
  )
);

drop policy if exists "admin_roles_select_self" on public.admin_roles;
create policy "admin_roles_select_self" on public.admin_roles
for select to authenticated using (user_id = (select auth.uid()));

-- No client INSERT/UPDATE/DELETE policy is intentionally created for admin_roles.
-- Privileged role grants must be issued through a trusted administrative process.

commit;
