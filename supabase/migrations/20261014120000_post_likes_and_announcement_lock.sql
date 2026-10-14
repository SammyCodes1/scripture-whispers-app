-- One like row per device, so concurrent likes cannot overwrite one integer.
-- Public announcement inserts are closed. Broadcasts go through broadcast-announcement.

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, device_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read post likes"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add a post like"
  ON public.post_likes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can remove a post like"
  ON public.post_likes FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
      SET likes = likes + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.community_posts
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_count ON public.post_likes;
CREATE TRIGGER post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_like_count();

-- Unlikes saved before this table existed have a count and no row.
CREATE OR REPLACE FUNCTION public.decrement_legacy_post_like(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_posts
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_legacy_post_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_legacy_post_like(uuid) TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can update community posts (likes)" ON public.community_posts;
DROP POLICY IF EXISTS "Allow insert for announcements" ON public.announcements;
