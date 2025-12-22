import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const bucket = process.env.SUPABASE_BRANDING_BUCKET || 'branding';
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const client = createClient(url, key);
  const { data: buckets, error: listErr } = await client.storage.listBuckets();
  if (listErr) {
    console.error('Failed to list buckets:', listErr.message);
    process.exit(1);
  }
  if (buckets?.some((b) => b.name === bucket)) {
    console.log(`Bucket '${bucket}' already exists.`);
    process.exit(0);
  }
  const { error } = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: '5242880'
  });
  if (error) {
    console.error('Failed to create bucket:', error.message);
    process.exit(1);
  }
  console.log(`Bucket '${bucket}' created.`);
}

main();



