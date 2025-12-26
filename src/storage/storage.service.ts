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

  async ensureBucket(bucketName?: string): Promise<void> {
    const bucket = bucketName || BUCKET;
    try {
      const { data: list, error: listError } = await this.client.storage.listBuckets();
      if (listError) {
        this.logger.error(`Failed to list buckets:`, listError);
        throw listError;
      }
      const exists = (list || []).some((b) => b.name === bucket);
      if (!exists) {
        this.logger.log(`Creating bucket: ${bucket}`);
        const { error } = await this.client.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: '5242880' // 5MB default
        });
        if (error) {
          this.logger.error(`Failed to create bucket ${bucket}:`, error);
          throw error;
        }
        this.logger.log(`Bucket ${bucket} created successfully`);
      } else {
        this.logger.log(`Bucket ${bucket} already exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket ${bucket}:`, error);
      throw error;
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

  /**
   * Upload file directly to Supabase storage
   */
  async uploadFile(bucket: string, path: string, file: Buffer | Uint8Array, contentType?: string) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
      });
    if (error) throw error;
    return data;
  }

  /**
   * Get public URL for a file in storage
   */
  getPublicUrlForBucket(bucket: string, path: string): string | null {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  /**
   * Create signed upload URL for VIP store images
   */
  async createVipStoreUploadUrl(clubId: string, filename: string) {
    await this.ensureBucket('vip-store');
    const path = `${clubId}/${Date.now()}-${filename}`;
    return await this.createSignedUploadUrlForBucket('vip-store', path);
  }

  /**
   * Create signed upload URL for push notification images/videos
   */
  async createPushNotificationUploadUrl(clubId: string, filename: string, isVideo: boolean = false) {
    await this.ensureBucket('push-notifications');
    const extension = isVideo ? 'mp4' : filename.split('.').pop() || 'jpg';
    const path = `${clubId}/${Date.now()}-${filename}`;
    return await this.createSignedUploadUrlForBucket('push-notifications', path);
  }

  /**
   * Create signed upload URL for specific bucket
   */
  private async createSignedUploadUrlForBucket(bucket: string, path: string) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUploadUrl(path, {
        upsert: false,
      });
    if (error) {
      this.logger.error(`Failed to create signed upload URL for ${bucket}/${path}:`, error);
      throw error;
    }
    return { 
      signedUrl: data.signedUrl, 
      path: data.path || path, 
      token: data.token,
      publicUrl: this.getPublicUrlForBucket(bucket, data.path || path) 
    };
  }
}



