-- The invoker function is exposed through PostgREST, so pin namespace
-- resolution even though RLS remains the final authorization boundary.
alter function public.search_contacts(text)
  set search_path = public, pg_temp;
