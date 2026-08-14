create or replace function public.debug_list_overloads()
returns table(proname text, args text, nargs int)
language sql
security definer
set search_path = public
stable
as $$
  select p.proname, pg_get_function_arguments(p.oid), p.pronargs
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'match_knowledge_base';
$$;
