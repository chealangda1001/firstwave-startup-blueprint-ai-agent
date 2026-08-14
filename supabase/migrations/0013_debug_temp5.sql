create or replace function public.debug_get_source()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select pg_get_functiondef(p.oid)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'match_knowledge_base';
$$;
