import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET = process.env.SUPABASE_BRANDING_BUCKET || 'branding';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
  }

  async ensureBucket(): Promise<void> {
    const { data: list } = await this.client.storage.listBuckets();
    const exists = (list || []).some((b) => b.name === BUCKET);
    if (!exists) {
      const { error } = await this.client.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: '5242880' // 5MB default
      });
      if (error) this.logger.error('Failed to create bucket', error);
    }
  }

  getPublicUrl(path: string): string | null {
    const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  async createSignedUploadUrl(path: string) {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return data; // { signedUrl, path, token }
  }
}



