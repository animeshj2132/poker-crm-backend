import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'kyc-documents';

async function createKycDocumentsBucket() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if bucket already exists
    console.log(`📦 Checking if bucket '${BUCKET_NAME}' exists...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists!`);
      return;
    }

    // Create the bucket
    console.log(`📦 Creating bucket '${BUCKET_NAME}'...`);
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Public read access (same as player app)
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
      ],
    });

    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }

    console.log(`✅ Successfully created bucket '${BUCKET_NAME}'!`);
    console.log(`   - Public: true`);
    console.log(`   - File size limit: 5MB`);
    console.log(`   - Allowed types: JPG, PNG, PDF`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
createKycDocumentsBucket()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


