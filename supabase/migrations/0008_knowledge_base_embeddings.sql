-- ============================================================================
-- Knowledge base RAG retrieval (roadmap P1.2). knowledge_base has existed
-- since migration 0001 with a full admin CRUD UI, but nothing has ever
-- queried it — the system prompt references `retrieved_context` as if it
-- were already being supplied, and it never was. This wires the retrieval
-- side: pgvector similarity search over card content, embedded via Voyage
-- AI (voyage-3-lite, 512 dimensions — see src/lib/blueprint/embeddings.ts).
-- ============================================================================

create extension if not exists vector;

alter table public.knowledge_base
  add column if not exists embedding vector(512);

-- ivfflat needs the table analyzed with representative data to pick good
-- cluster centroids; harmless to create early on a small/empty table, and
-- a `reindex` after the initial backfill will tighten it once real data
-- exists (see scripts/backfill-knowledge-base-embeddings.ts).
create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ----------------------------------------------------------------------------
-- match_knowledge_base: top-N active cards by cosine similarity, with an
-- optional similarity floor so a session with no genuinely relevant cards
-- gets nothing injected rather than the "least bad" unrelated ones.
-- security definer + fixed search_path so it's callable from the app's
-- normal (RLS-respecting) client without needing its own select policy on
-- every caller — knowledge_base is already broadly readable by
-- authenticated users (migration 0002), this just adds the ranking.
-- ----------------------------------------------------------------------------
create or replace function public.match_knowledge_base(
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
