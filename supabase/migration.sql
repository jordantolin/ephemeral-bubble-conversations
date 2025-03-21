
-- Create a bucket for bubble assets
CREATE BUCKET IF NOT EXISTS bubble_assets;

-- Set up public access to bubble_assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('bubble_assets', 'bubble_assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create a dedicated avatars bucket if it doesn't exist
CREATE BUCKET IF NOT EXISTS avatars;

-- Set up public access to avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Add policies for avatar access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy for authenticated users to upload avatars
CREATE POLICY "Authenticated Users Can Upload Avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Policy for users to update their own avatars
CREATE POLICY "Users Can Update Their Own Avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Policy for users to delete their own avatars
CREATE POLICY "Users Can Delete Their Own Avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Add bubble assets policies
CREATE POLICY "Public Read Access for Bubble Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'bubble_assets');

-- Policy for authenticated users to upload bubble assets
CREATE POLICY "Authenticated Users Can Upload Bubble Assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bubble_assets');

-- Policy for users to update their own bubble assets
CREATE POLICY "Users Can Update Their Own Bubble Assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bubble_assets');

-- Policy for users to delete their own bubble assets
CREATE POLICY "Users Can Delete Their Own Bubble Assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bubble_assets');
