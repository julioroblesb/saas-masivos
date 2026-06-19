-- Create a stable function to search contacts that works seamlessly with RLS and PostgREST range/count
create or replace function search_contacts(search_term text)
returns setof crm_marketing_contacts
language sql
stable
as $$
  select *
  from crm_marketing_contacts
  where
    phone ilike '%' || search_term || '%'
    or name ilike '%' || search_term || '%'
    or array_to_string(tags, ', ') ilike '%' || search_term || '%';
$$;
