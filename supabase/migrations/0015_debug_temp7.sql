create or replace function public.debug_where_isolate(
  query_embedding vector(512),
  min_similarity float default 0.3
)
returns table (id uuid, similarity float, cond1 boolean, cond2 boolean, cond3 boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    id,
    1 - (embedding <=> query_embedding) as similarity,
    (is_active = true) as cond1,
    (embedding is not null) as cond2,
    (1 - (embedding <=> query_embedding) >= min_similarity) as cond3
  from public.knowledge_base;
$$;
