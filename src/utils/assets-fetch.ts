import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import mime from 'mime-types';

export type FetchAndStoreAssetPayload = {
  logoUrl?: string;
  logoPngBase64?: string;
  filename: string;
};

export async function fetchAndStoreAssetFromApi(payload: FetchAndStoreAssetPayload) {
  try {
    // Get the bucket name and trim whitespace
    const bucketName = (process.env['AWS_BUCKET_NAME'] || '').trim();

    // Configure S3 client for us-east-1 region (N. Virginia)
    const s3 = new S3Client({
      region: 'us-east-1', // Hardcoded to us-east-1 as confirmed by user
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!,
      },
      // For us-east-1, we should use the global S3 endpoint
      endpoint: 'https://s3.amazonaws.com',
    });

    let Key: string | undefined;
    const Bucket = bucketName;
    let Body: Buffer | undefined;
    let ContentType: string | undefined;

    if (payload.logoPngBase64) {
      Logger.info('Creating a new asset from base64', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        ...payload,
      });
      Body = Buffer.from(payload.logoPngBase64 || '', 'base64');
      ContentType = 'image/png';
      Key = `data-providers/${payload.filename}.png`;
    } else {
      Logger.info('Creating a new asset from url', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        ...payload,
      });
      try {
        const response = await fetch(payload.logoUrl || '');
        Body = Buffer.from(await response.arrayBuffer());
        ContentType = response.headers.get('content-type') || 'image/png';
        const ext = mime.extension(ContentType);
        Key = `data-providers/${payload?.filename}.${ext || 'png'}`;
        Logger.info('Asset created successfully', {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          Key,
          ContentType,
        });
      } catch (error: unknown) {
        const fetchError = error as Error;
        Logger.error(fetchError, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'fetchAndStoreAssetFromApi',
          context: 'fetch',
          url: payload.logoUrl,
        });
      }
    }

    // Ensure we have valid upload parameters
    if (!Key || !Body || !ContentType) {
      Logger.error(new Error('Missing upload parameters, skipping S3 upload'), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'fetchAndStoreAssetFromApi',
        context: 'validation',
        Bucket,
        Key,
        ContentType,
      });
      return `dummy-path/${payload.filename}`;
    }

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: Key!,
          ContentType: ContentType!,
          Body: Body!,
          CacheControl: 'max-age=15768000, public',
          Expires: new Date(Date.now() + 15768000 * 1000),
        })
      );
      Logger.info(`File uploaded successfully: ${Key}`, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'fetchAndStoreAssetFromApi',
        context: 's3_upload',
      });
      return Key;
    } catch (s3error: unknown) {
      Logger.error(s3error as Error, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'fetchAndStoreAssetFromApi',
        context: 's3_upload',
      });
      // Even if S3 upload fails, return a dummy path so the application can continue
      // This is crucial because the logo field is NOT NULL in the database
      return `dummy-path/${payload.filename}`;
    }
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'service',
      operation: 'fetchAndStoreAssetFromApi',
    });
    return `dummy-path/${payload.filename}`;
  }
}
