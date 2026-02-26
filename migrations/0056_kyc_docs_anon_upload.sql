-- Allow anonymous (browser) upload to kyc-docs so frontend can upload when backend cannot reach Supabase
CREATE POLICY "kyc_docs_anon_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-docs');
