import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import mime from 'mime-types';
import type { Response } from 'playwright';
import type { BrowserSession } from './browser-session';

const DEFAULT_ASSET_DIRECTORY = 'data-providers';
const DEFAULT_CACHE_CONTROL = 'max-age=15768000, public';
const DEFAULT_EXPIRES_MS = 15768000 * 1000;

export type BrowserAssetUploadInput = {
  assetUrl: string;
  filename: string;
  directory?: string;
  cacheControl?: string;
  expires?: Date;
};

export type BrowserAssetUploadResult = {
  assetKey: string;
  assetUrl?: string;
  contentType: string;
  requestUrl: string;
  responseUrl: string;
};

export class BrowserAssetTransportError extends Error {
  public readonly requestUrl: string;
  public readonly status?: number;
  public readonly responseUrl?: string;
  public readonly causeMessage?: string;

  constructor(props: {
    message: string;
    requestUrl: string;
    status?: number;
    responseUrl?: string;
    causeMessage?: string;
  }) {
    super(props.message);
    this.name = 'BrowserAssetTransportError';
    this.requestUrl = props.requestUrl;
    this.status = props.status;
    this.responseUrl = props.responseUrl;
    this.causeMessage = props.causeMessage;
  }
}

export class BrowserAssetUploader {
  constructor(private readonly session: BrowserSession) {}

  public async upload(input: BrowserAssetUploadInput): Promise<BrowserAssetUploadResult> {
    const fetchedAsset = await this.fetchAsset(input.assetUrl);
    const assetKey = await uploadBufferToS3({
      buffer: fetchedAsset.buffer,
      filename: input.filename,
      contentType: fetchedAsset.contentType,
      fileExtension: fetchedAsset.fileExtension,
      directory: input.directory,
      cacheControl: input.cacheControl,
      expires: input.expires,
    });

    return {
      assetKey,
      assetUrl: buildCloudFrontUrl(assetKey),
      contentType: fetchedAsset.contentType,
      requestUrl: fetchedAsset.requestUrl,
      responseUrl: fetchedAsset.responseUrl,
    };
  }

  private async fetchAsset(requestUrl: string): Promise<{
    buffer: Buffer;
    contentType: string;
    fileExtension: string;
    requestUrl: string;
    responseUrl: string;
  }> {
    const response = await this.navigateToAsset(requestUrl);

    if (!response.ok()) {
      throw new BrowserAssetTransportError({
        message: `Browser asset request failed for URL: ${requestUrl}`,
        requestUrl,
        status: response.status(),
        responseUrl: response.url(),
      });
    }

    const buffer = await response.body();

    if (buffer.byteLength === 0) {
      throw new BrowserAssetTransportError({
        message: `Browser asset request returned an empty body for URL: ${requestUrl}`,
        requestUrl,
        status: response.status(),
        responseUrl: response.url(),
      });
    }

    const assetType = await resolveAssetType({
      headerContentType: response.headers()['content-type'],
      buffer,
      requestUrl,
      responseUrl: response.url(),
      status: response.status(),
    });

    return {
      buffer,
      contentType: assetType.contentType,
      fileExtension: assetType.fileExtension,
      requestUrl,
      responseUrl: response.url(),
    };
  }

  private async navigateToAsset(requestUrl: string): Promise<Response> {
    const page = this.session.getPage();

    let response: Response | null;

    try {
      response = await page.goto(requestUrl, {
        waitUntil: 'load',
        timeout: 30_000,
      });
    } catch (error) {
      throw new BrowserAssetTransportError({
        message: `Browser asset navigation failed for URL: ${requestUrl}`,
        requestUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response) {
      throw new BrowserAssetTransportError({
        message: `Browser asset navigation returned no response for URL: ${requestUrl}`,
        requestUrl,
      });
    }

    return response;
  }
}

const uploadBufferToS3 = async (input: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  fileExtension: string;
  directory?: string;
  cacheControl?: string;
  expires?: Date;
}): Promise<string> => {
  const bucketName = (process.env.AWS_BUCKET_NAME || '').trim();
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not properly configured for asset upload');
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const assetKey = `${input.directory ?? DEFAULT_ASSET_DIRECTORY}/${input.filename}.${input.fileExtension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: assetKey,
      Body: input.buffer,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? DEFAULT_CACHE_CONTROL,
      Expires: input.expires ?? new Date(Date.now() + DEFAULT_EXPIRES_MS),
    })
  );

  return assetKey;
};

const buildCloudFrontUrl = (assetKey: string): string | undefined => {
  const cloudFrontDomain = (process.env.AWS_CLOUDFRONT_URL || '').trim();

  if (!cloudFrontDomain) {
    return undefined;
  }

  return `https://${cloudFrontDomain}/${assetKey}`;
};

const resolveAssetType = async (input: {
  headerContentType: string | undefined;
  buffer: Buffer;
  requestUrl: string;
  responseUrl: string;
  status: number;
}): Promise<{ contentType: string; fileExtension: string }> => {
  const headerType = normalizeHeaderContentType(input.headerContentType);

  if (headerType) {
    return headerType;
  }

  const detectedType = await fileTypeFromBuffer(input.buffer);

  if (detectedType?.mime.startsWith('image/')) {
    return {
      contentType: detectedType.mime,
      fileExtension: detectedType.ext,
    };
  }

  throw new BrowserAssetTransportError({
    message: `Browser asset type could not be resolved for URL: ${input.requestUrl}`,
    requestUrl: input.requestUrl,
    status: input.status,
    responseUrl: input.responseUrl,
    causeMessage:
      'Response content type was missing or not an image, and buffer detection could not identify a supported image type',
  });
};

const normalizeHeaderContentType = (
  value: string | undefined
): { contentType: string; fileExtension: string } | null => {
  if (!value) {
    return null;
  }

  const normalizedContentType = value.split(';', 1)[0]?.trim().toLowerCase();

  if (!normalizedContentType?.startsWith('image/')) {
    return null;
  }

  const fileExtension = mime.extension(normalizedContentType);

  if (!fileExtension) {
    return null;
  }

  return {
    contentType: normalizedContentType,
    fileExtension,
  };
};
