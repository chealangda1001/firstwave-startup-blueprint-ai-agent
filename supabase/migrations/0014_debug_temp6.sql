create or replace function public.debug_match_copy(
  query_embedding vector(512),
  match_count int default 5,
  min_similarity float default 0.3
)
returns table (
  id uuid,
  title text,
  domain text,
  card_type public.knowledge_base_card_type,
  content text,
  similarity float
)
language sql
security definer
set search_path = public
stable
as $$
  select
    id,
    title,
    domain,
    card_type,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_base
  where is_active = true
    and embedding is not null
    and 1 - (embedding <=> query_embedding) >= min_similarity
  order by embedding <=> query_embedding
  limit match_count;
$$;
