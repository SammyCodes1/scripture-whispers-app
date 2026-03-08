
-- Create profile pictures bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);

-- Allow anyone to upload profile pictures
CREATE POLICY "Anyone can upload profile pictures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-pictures');
CREATE POLICY "Anyone can read profile pictures" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');
CREATE POLICY "Anyone can update own profile pictures" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-pictures');

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  author_name text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.user_profiles FOR UPDATE USING (true);
