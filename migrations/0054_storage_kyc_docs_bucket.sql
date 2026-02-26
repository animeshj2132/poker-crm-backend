-- Migration: Use kyc-docs bucket for all player KYC. Alters existing storage setup.
-- Run this on existing Supabase projects that had kyc-documents or no KYC bucket.

-- 1. Ensure kyc-docs bucket exists (create via Dashboard if this fails: Storage → New bucket → kyc-docs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-docs', 'kyc-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop old policies that referenced kyc-documents (if they exist)
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can access all documents" ON storage.objects;
DROP POLICY IF EXISTS "Players can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Players can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all KYC documents" ON storage.objects;

-- 3. Create policies for kyc-docs bucket
CREATE POLICY "kyc_docs_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-docs');

CREATE POLICY "kyc_docs_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-docs');

CREATE POLICY "kyc_docs_service_role"
ON storage.objects FOR ALL
USING (auth.role() = 'service_role' AND bucket_id = 'kyc-docs')
WITH CHECK (auth.role() = 'service_role' AND bucket_id = 'kyc-docs');
