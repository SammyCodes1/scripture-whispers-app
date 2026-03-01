
-- Community posts table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community posts"
ON public.community_posts FOR SELECT USING (true);

CREATE POLICY "Anyone can insert community posts"
ON public.community_posts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update community posts (likes)"
ON public.community_posts FOR UPDATE USING (true);

-- Comments table
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
ON public.community_comments FOR SELECT USING (true);

CREATE POLICY "Anyone can insert comments"
ON public.community_comments FOR INSERT WITH CHECK (true);

-- Saved verses (bookmarks/highlights) - public for now, no auth
CREATE TABLE public.saved_verses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  ref TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bookmark', 'highlight')),
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved verses"
ON public.saved_verses FOR SELECT USING (true);

CREATE POLICY "Users can insert saved verses"
ON public.saved_verses FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own saved verses"
ON public.saved_verses FOR DELETE USING (true);

-- Enable realtime for community
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
