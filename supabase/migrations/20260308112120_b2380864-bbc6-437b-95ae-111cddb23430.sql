
-- Add image_url column to community_posts
ALTER TABLE public.community_posts ADD COLUMN image_url text DEFAULT null;

-- Create storage bucket for community attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('community-attachments', 'community-attachments', true);

-- Allow anyone to upload to the bucket
CREATE POLICY "Anyone can upload community attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-attachments');

-- Allow anyone to read from the bucket
CREATE POLICY "Anyone can read community attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-attachments');
