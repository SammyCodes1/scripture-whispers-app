-- A signed-in reader owns one library. Anonymous rows keep a null user_id.
alter table public.verse_libraries
  add column user_id uuid unique references auth.users (id) on delete cascade;
