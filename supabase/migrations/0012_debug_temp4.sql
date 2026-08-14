create or replace function public.debug_full_match(query_embedding vector(512))
returns table(id uuid, is_active boolean, emb_not_null boolean, similarity float)
language sql
security definer
set search_path = public
stable
as $$
  select
    id,
    is_active,
    (embedding is not null) as emb_not_null,
    1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_base;
$$;
