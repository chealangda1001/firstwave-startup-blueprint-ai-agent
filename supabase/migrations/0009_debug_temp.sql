create or replace function public.debug_vector_dims()
returns table(id uuid, dims int)
language sql
security definer
set search_path = public
stable
as $$
  select id, vector_dims(embedding) from public.knowledge_base where embedding is not null;
$$;
