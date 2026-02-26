-- Set kyc-docs bucket file size limit to 5 MB (run after 0054_storage_kyc_docs_bucket.sql)
-- 5 MB = 5242880 bytes
-- If this fails (e.g. read-only storage schema), set in Dashboard: Storage → kyc-docs → Edit bucket → File size limit: 5 MB

UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'kyc-docs';
