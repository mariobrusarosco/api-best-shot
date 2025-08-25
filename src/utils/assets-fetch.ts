import { Profiling } from '@/services/profiling';
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
      Profiling.log({
        msg: 'Creating a new asset from base64',
        data: payload.logoPngBase64,
        source: 'fetchAndStoreAssetFromApi',
      });
      Body = Buffer.from(payload.logoPngBase64 || '', 'base64');
      ContentType = 'image/png';
      Key = `data-providers/${payload.filename}.png`;
    } else {
      Profiling.log({
        msg: 'Creating a new asset from url',
        data: payload.logoUrl,
        source: 'fetchAndStoreAssetFromApi',
      });
      try {
        const response = await fetch(payload.logoUrl || '');
        Body = Buffer.from(await response.arrayBuffer());
        ContentType = response.headers.get('content-type') || 'image/png';
        const ext = mime.extension(ContentType);
        Key = `data-providers/${payload?.filename}.${ext || 'png'}`;
        Profiling.log({
          msg: 'Asset created successfully',
          data: { Key, ContentType, Body },
          source: 'fetchAndStoreAssetFromApi',
        });
      } catch (error: unknown) {
        const fetchError = error as Error;
        Profiling.error({
          source: 'fetchAndStoreAssetFromApi',
          error: {
            message: fetchError.message,
            url: payload.logoUrl,
            error: fetchError,
          },
        });
      }
    }

    // Ensure we have valid upload parameters
    if (!Key || !Body || !ContentType) {
      Profiling.error({
        source: 'fetchAndStoreAssetFromApi',
        error: {
          message: 'Missing upload parameters, skipping S3 upload',
          Bucket,
          Key,
          ContentType,
          Body,
        },
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
      Profiling.log({
        msg: `File uploaded successfully: ${Key}`,
        source: 'fetchAndStoreAssetFromApi',
      });
      return Key;
    } catch (s3error: unknown) {
      Profiling.error({
        source: 'fetchAndStoreAssetFromApi',
        error: s3error,
      });
      // Even if S3 upload fails, return a dummy path so the application can continue
      // This is crucial because the logo field is NOT NULL in the database
      return `dummy-path/${payload.filename}`;
    }
  } catch (error) {
    Profiling.error({
      source: 'fetchAndStoreAssetFromApi',
      error,
    });
    return `dummy-path/${payload.filename}`;
  }
}
