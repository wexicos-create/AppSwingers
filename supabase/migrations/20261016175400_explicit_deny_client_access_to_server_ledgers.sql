-- Explicitly document client-deny policies on server-only ledgers.
do $$
declare
  t text;
begin
  foreach t in array array['admin_audit','billing_events','identity_verifications'] loop
    execute format('drop policy if exists %I on public.%I', 'deny_browser_clients', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      'deny_browser_clients', t
    );
  end loop;
end $$;