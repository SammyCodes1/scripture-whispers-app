
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_device_id text NOT NULL,
  author_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (subscriber_device_id, author_name)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscriptions" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own subscriptions" ON public.subscriptions FOR DELETE USING (true);
