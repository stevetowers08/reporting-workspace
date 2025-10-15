-- Fix Logo Upload Storage Issue
-- Run this in your Supabase SQL Editor (https://bdmcdyxjdkgitphieklb.supabase.co)
-- 1. Create the client-logos storage bucket
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'client-logos',
        'client-logos',
        true,
        5242880,
        -- 5MB limit
        ARRAY ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    ) ON CONFLICT (id) DO
UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
-- 2. Drop any existing policies
DROP POLICY IF EXISTS "Allow anonymous access to client logos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous access to client logos" ON storage.objects;
-- 3. Create a permissive policy for anonymous access
CREATE POLICY "Allow anonymous access to client logos bucket" ON storage.objects FOR ALL USING (bucket_id = 'client-logos') WITH CHECK (bucket_id = 'client-logos');
-- 4. Verify the bucket was created
SELECT name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'client-logos';
-- 5. Verify the policy was created
SELECT policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE '%client logos%';