-- Server-side cache for licensed Bible chapters served by the `bible-versions` edge function.
-- Rows must never live longer than 14 days (API.Bible licence); the function refreshes at 7 days
-- and purges anything older than 14. Only the service role (edge function) can read or write it.
create table if not exists public.bible_chapter_cache (
  key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.bible_chapter_cache enable row level security;
-- Intentionally no policies: anon/authenticated users have no access; the service role bypasses RLS.

create index if not exists bible_chapter_cache_fetched_at_idx on public.bible_chapter_cache (fetched_at);
