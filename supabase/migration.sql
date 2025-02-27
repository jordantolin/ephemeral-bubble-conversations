
-- Create a bucket for bubble assets
CREATE BUCKET IF NOT EXISTS bubble_assets;

-- Set up public access to bubble_assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('bubble_assets', 'bubble_assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Add CORS configuration for bubble_assets
UPDATE storage.buckets
SET cors_origins = array['*']
WHERE id = 'bubble_assets';
