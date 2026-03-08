
-- Create announcements table for broadcast messages
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  message text NOT NULL,
  sender_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read announcements
CREATE POLICY "Anyone can read announcements"
ON public.announcements FOR SELECT
USING (true);

-- Only edge functions (service role) can insert
-- No INSERT policy for anon role = only service_role can insert

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
