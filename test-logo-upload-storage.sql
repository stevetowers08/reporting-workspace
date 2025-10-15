-- Test Logo Upload Storage
-- Run this after running fix-logo-upload-storage.sql
-- Test 1: Check if bucket exists and is public
SELECT name,
    public,
    file_size_limit,
    allowed_mime_types,
    CASE
        WHEN public = true THEN '✅ Bucket is public'
        ELSE '❌ Bucket is not public'
    END as status
FROM storage.buckets
WHERE name = 'client-logos';
-- Test 2: Check RLS policies
SELECT policyname,
    CASE
        WHEN roles = '{public}' THEN '✅ Policy allows public access'
        ELSE '❌ Policy does not allow public access'
    END as access_status,
    cmd as operations_allowed
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE '%client logos%';
-- Test 3: Try to insert a test file (this should work if everything is configured correctly)
-- Note: This is just a test - the actual file upload will be done from the frontend
INSERT INTO storage.objects (bucket_id, name, owner, path_tokens)
VALUES (
        'client-logos',
        'test-file.txt',
        auth.uid(),
        ARRAY ['test-file.txt']
    ) ON CONFLICT (bucket_id, name) DO NOTHING;
-- Test 4: Check if the test file was inserted
SELECT bucket_id,
    name,
    CASE
        WHEN name = 'test-file.txt' THEN '✅ Test file upload successful'
        ELSE '❌ Test file upload failed'
    END as upload_status
FROM storage.objects
WHERE bucket_id = 'client-logos'
    AND name = 'test-file.txt';
-- Clean up test file
DELETE FROM storage.objects
WHERE bucket_id = 'client-logos'
    AND name = 'test-file.txt';