-- Shared prayer requests. A prayed mark is one row per device.

CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  request text NOT NULL,
  device_id text,
  prayed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prayers"
  ON public.prayer_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add a prayer"
  ON public.prayer_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete a prayer"
  ON public.prayer_requests FOR DELETE
  USING (true);

CREATE TABLE IF NOT EXISTS public.prayer_marks (
  prayer_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prayer_id, device_id)
);

ALTER TABLE public.prayer_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prayer marks"
  ON public.prayer_marks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add a prayer mark"
  ON public.prayer_marks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can remove a prayer mark"
  ON public.prayer_marks FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION public.sync_prayer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.prayer_requests
      SET prayed_count = prayed_count + 1
      WHERE id = NEW.prayer_id;
    RETURN NEW;
  END IF;

  UPDATE public.prayer_requests
    SET prayed_count = GREATEST(prayed_count - 1, 0)
    WHERE id = OLD.prayer_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prayer_marks_count ON public.prayer_marks;
CREATE TRIGGER prayer_marks_count
  AFTER INSERT OR DELETE ON public.prayer_marks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_prayer_count();

GRANT SELECT, INSERT, DELETE ON public.prayer_requests TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.prayer_marks TO anon, authenticated;
