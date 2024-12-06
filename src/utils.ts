import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
var mime = require('mime-types');

export const isNullable = (value: any) => {
  return value === null || value === undefined;
};

export const safeDate = (date: any) =>
  date === null || date === undefined ? null : new Date(date);
export const safeString = (str: any) =>
  str === null || str === undefined ? null : String(str);

export const toNumberOrNull = (val: string | null | undefined) => {
  if (val === '' || val === null || undefined) return null;

  return Number(val);
};

export const toNumberOrZero = (val: string | null | undefined) => {
  if (val === '' || val === null || undefined) return 0;

  return Number(val);
};

export async function fetchAndStoreAssetFromApi(payload: {
  custom?: {
    base64: string;
    contentType: string;
  };
  url: string;
  filename: string;
}) {
  try {
    const s3 = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!,
      },
    });
    let Key = null,
      Bucket = process.env['AWS_BUCKET_NAME'],
      Body = null,
      ContentType = null;

    const customImage = payload.custom?.base64 && payload.custom?.contentType;
    if (customImage) {
      const ext = mime.extension(payload.custom?.contentType);

      Body = Buffer.from(payload.custom?.base64 || '', 'base64');
      ContentType = payload.custom?.contentType;
      Key = `data-providers/assets/${payload.filename}.${ext}`;
    } else {
      const response = await axios.get(payload?.url, { responseType: 'arraybuffer' });
      const ext = mime.extension(response.headers['content-type']);

      Body = Buffer.from(response.data);
      ContentType = response.headers['content-type'];
      Key = `data-providers/assets/${payload?.filename}.${ext}`;
    }

    const uploadOutcome = await s3.send(
      new PutObjectCommand({
        Bucket,
        Key,
        ContentType,
        Body,
      })
    );
    console.log(`File uploaded successfully: ${Key}`);
    return uploadOutcome;
  } catch (error) {
    console.error('[ERROR WHEN FETCHING AND STORING A NEW TOURNAMENT LOGO]: ', error);
  }
}

export type FetchAndStoreAssetPayload = {
  logoUrl?: string;
  logoPngBase64?: string;
  filename: string;
};

export async function fetchAndStoreAssetFromApiNew(payload: FetchAndStoreAssetPayload) {
  try {
    const s3 = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!,
      },
    });
    let Key = null,
      Bucket = process.env['AWS_BUCKET_NAME'],
      Body = null,
      ContentType = null;

    if (payload.logoPngBase64) {
      Body = Buffer.from(payload.logoPngBase64 || '', 'base64');
      ContentType = 'image/png';
      Key = `data-providers/${payload.filename}.png`;
    } else {
      const response = await axios.get(payload.logoUrl || '', {
        responseType: 'arraybuffer',
      });
      const ext = mime.extension(response.headers['content-type']);

      Body = Buffer.from(response.data);
      ContentType = response.headers['content-type'];
      Key = `data-providers/${payload?.filename}.${ext}`;
    }

    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key,
        ContentType,
        Body,
        CacheControl: 'max-age=15768000, public',
        Expires: new Date(Date.now() + 15768000 * 1000),
      })
    );
    console.log(`File uploaded successfully: ${Key}`);
    return Key;
  } catch (error) {
    console.error('[ERROR WHEN FETCHING AND STORING A NEW TOURNAMENT LOGO]: ', error);
  }
}
