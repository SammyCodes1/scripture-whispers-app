-- Private library for bookmarks, highlights, and notes.
-- The library code is the secret. There is no anon policy: the verse-library
-- function reads and writes this table with the service role.

create table public.verse_libraries (
  code text primary key,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint verse_libraries_code_format
    check (code ~ '^[abcdefghijkmnpqrstuvwxyz23456789]{4}(-[abcdefghijkmnpqrstuvwxyz23456789]{4}){3}$'),
  constraint verse_libraries_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint verse_libraries_revision_positive
    check (revision > 0)
);

alter table public.verse_libraries enable row level security;

revoke all on table public.verse_libraries from anon, authenticated;
grant select, insert, update, delete on table public.verse_libraries to service_role;
