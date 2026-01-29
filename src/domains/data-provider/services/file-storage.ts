import { env } from '@/config/env';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import mime from 'mime-types';

export interface UploadFileOptions {
  buffer: Buffer;
  filename: string;
  contentType: string;
  directory?: string;
  cacheControl?: string;
  expires?: Date;
}

export class S3FileStorage {
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly credentialsValid: boolean;

  constructor() {
    this.bucketName = env.AWS_BUCKET_NAME;

    // Validate credentials before creating client
    const accessKeyId = env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

    this.credentialsValid = !!(accessKeyId && secretAccessKey && this.bucketName);

    if (this.credentialsValid) {
      this.s3Client = new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  public async uploadFile(options: UploadFileOptions): Promise<string> {
    // Early validation - throw error if credentials invalid
    if (!this.credentialsValid || !this.s3Client) {
      throw new Error('AWS credentials not properly configured for S3 upload');
    }

    try {
      const {
        buffer,
        filename,
        contentType,
        directory = 'uploads',
        cacheControl = 'max-age=15768000, public',
        expires = new Date(Date.now() + 15768000 * 1000),
      } = options;

      const ext = mime.extension(contentType) || 'bin';
      const key = `${directory}/${filename}.${ext}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: cacheControl,
          Expires: expires,
        })
      );

      Logger.info(`[S3FileStorage] File uploaded successfully: ${key}`, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
      });
      return key;
    } catch (error) {
      console.error('[S3FileStorage] Error uploading file:', error);
      throw error; // Re-throw to let caller handle fallback
    }
  }

  public async uploadBase64Image(base64Data: string, filename: string, directory = 'uploads'): Promise<string> {
    const buffer = Buffer.from(base64Data, 'base64');
    return this.uploadFile({
      buffer,
      filename,
      contentType: 'image/png',
      directory,
    });
  }

  public getCloudFrontUrl(s3Key: string): string {
    return `https://${env.AWS_CLOUDFRONT_URL}/${s3Key}`;
  }
}
