-- The lifestyle community is authenticated-only. RLS remains enabled, and anon
-- must not retain table-level privileges that are not needed by the browser.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;