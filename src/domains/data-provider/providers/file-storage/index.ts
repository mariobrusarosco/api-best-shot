import { Profiling } from '@/services/profiling';
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
    this.bucketName = (process.env['AWS_BUCKET_NAME'] || '').trim();

    // Validate credentials before creating client
    const accessKeyId = process.env['AWS_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];

    this.credentialsValid = !!(accessKeyId && secretAccessKey && this.bucketName);

    if (this.credentialsValid) {
      this.s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
        },
        endpoint: 'https://s3.amazonaws.com',
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

      Profiling.log({
        msg: `[S3FileStorage] File uploaded successfully: ${key}`,
        source: 'DATA_PROVIDER_FILE_STORAGE',
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
}
