-- ============================================================================
-- Cleanup after debugging match_knowledge_base returning zero rows despite
-- correct data: the ivfflat index (0008) was built with `lists = 100`
-- against an all-but-empty table. ivfflat needs real data volume to build
-- meaningful clusters — with far fewer rows than lists, the approximate
-- search can miss matches entirely, exactly what happened here. Already
-- dropped ad hoc while diagnosing (0016); this migration is the permanent
-- record and replaces it with hnsw, which builds incrementally and has no
-- equivalent "needs training data first" failure mode — safe from an empty
-- table onward. Also drops every debug_* function created while isolating
-- the bug (0009-0015).
-- ============================================================================

drop function if exists public.debug_vector_dims();
drop function if exists public.debug_query_param(vector);
drop function if exists public.debug_list_overloads();
drop function if exists public.debug_full_match(vector);
drop function if exists public.debug_get_source();
drop function if exists public.debug_match_copy(vector, int, float);
drop function if exists public.debug_where_isolate(vector, float);

create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using hnsw (embedding vector_cosine_ops);
