create or replace function public.debug_query_param(query_embedding vector(512))
returns table(param_dims int, sample_distance float)
language sql
security definer
set search_path = public
stable
as $$
  select
    vector_dims(query_embedding),
    (select embedding <=> query_embedding from public.knowledge_base where embedding is not null limit 1);
$$;
