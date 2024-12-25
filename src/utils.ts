import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
var mime = require('mime-types');

export const isNullable = (value: any) => {
  return value === null || value === undefined;
};

export const safeDate = (date: any) =>
  date === null || date === undefined ? null : new Date(date);

export const safeISODate = (date: any) => {
  console.log(date, typeof date, new Date(date), typeof new Date(date));

  return date === null || date === undefined ? null : new Date(date).toISOString();
};

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

export type FetchAndStoreAssetPayload = {
  logoUrl?: string;
  logoPngBase64?: string;
  filename: string;
};

export async function fetchAndStoreAssetFromApi(payload: FetchAndStoreAssetPayload) {
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

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
