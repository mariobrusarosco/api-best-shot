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

export async function fetchAndStoreAssetFromApi({
  url,
  custom,
  filename,
}: {
  custom?: {
    base64: string;
    contentType: string;
  };
  url: string;
  filename: string;
}) {
  try {
    const createCustomImage = custom?.base64 && custom?.contentType;

    const s3 = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!,
      },
    });

    if (createCustomImage) {
      const fileData = Buffer.from(custom.base64, 'base64');
      const ext = mime.extension(custom.contentType);

      const command = new PutObjectCommand({
        Bucket: process.env['AWS_BUCKET_NAME'],
        Key: `${filename}.${ext}`,
        Body: fileData,
        ContentType: custom.contentType,
      });
      await s3.send(command);
      console.log(`Custom File uploaded successfully: ${filename}.${ext}`);
      return;
    }

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'];
    const fileData = Buffer.from(response.data);
    const ext = mime.extension(contentType);

    const command = new PutObjectCommand({
      Bucket: process.env['AWS_BUCKET_NAME'],
      Key: `${filename}.${ext}`,
      Body: fileData,
      ContentType: contentType,
    });
    await s3.send(command);
    console.log(`File uploaded successfully: ${filename}.${ext}`);
    return false;
  } catch (error) {
    console.error('[ERROR WHEN FETCHING AND STORING A NEW TOURNAMENT LOGO]: ', error);
  }
}
