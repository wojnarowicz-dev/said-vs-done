-- The witness for the fixture's 30-day promise. It lives in the APP fixture,
-- not the SITE fixture, on purpose: this pair is the smallest reproduction of
-- the two-repository problem, and the golden run must find it only when both
-- roots are given.
create or replace function public.purge_old_reports()
returns integer
language plpgsql
as $$
begin
  delete from public.reports
   where created_at < now() - interval '30 days';
  return 1;
end;
$$;
