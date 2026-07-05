import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  ProviderTransportFlow,
  ProviderTransportFlowStep,
} from '@/domains/data-provider-v2/contracts/provider-transport-flow';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import FileType from 'file-type';
import mime from 'mime-types';
import type { Response } from 'playwright';
import type { BrowserSession } from './browser-session';

const DEFAULT_ASSET_DIRECTORY = 'data-providers';
const DEFAULT_CACHE_CONTROL = 'max-age=15768000, public';
const DEFAULT_EXPIRES_MS = 15768000 * 1000;
const RESPONSE_BODY_SNIPPET_MAX_LENGTH = 1_000;

export type BrowserAssetUploadInput = {
  providerLogoUrl: string;
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
  transportFlow?: ProviderTransportFlow;
};

export class BrowserAssetTransportError extends Error {
  public readonly requestUrl: string;
  public readonly status?: number;
  public readonly responseUrl?: string;
  public readonly causeMessage?: string;
  public readonly responseBodySnippet?: string;
  public readonly transportFlow?: ProviderTransportFlow;

  constructor(props: {
    message: string;
    requestUrl: string;
    status?: number;
    responseUrl?: string;
    causeMessage?: string;
    responseBodySnippet?: string;
    transportFlow?: ProviderTransportFlow;
  }) {
    super(props.message);
    this.name = 'BrowserAssetTransportError';
    this.requestUrl = props.requestUrl;
    this.status = props.status;
    this.responseUrl = props.responseUrl;
    this.causeMessage = props.causeMessage;
    this.responseBodySnippet = props.responseBodySnippet;
    this.transportFlow = props.transportFlow;
  }
}

export class BrowserAssetUploader {
  private readonly tournamentPublicUrl?: string;

  constructor(
    private readonly session: BrowserSession,
    options?: { tournamentPublicUrl?: string }
  ) {
    this.tournamentPublicUrl = options?.tournamentPublicUrl?.trim() || undefined;
  }

  public async upload(input: BrowserAssetUploadInput): Promise<BrowserAssetUploadResult> {
    const fetchedAsset = await this.fetchAsset(input.providerLogoUrl);
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
      transportFlow: fetchedAsset.transportFlow,
    };
  }

  private async fetchAsset(requestUrl: string): Promise<{
    buffer: Buffer;
    contentType: string;
    fileExtension: string;
    requestUrl: string;
    responseUrl: string;
    transportFlow: ProviderTransportFlow;
  }> {
    const { response, responseBodySnippet, transportFlow } = await this.fetchAssetResponse(requestUrl);

    if (!response.ok()) {
      throw new BrowserAssetTransportError({
        message: `Browser asset request failed for URL: ${requestUrl}`,
        requestUrl,
        status: response.status(),
        responseUrl: response.url(),
        responseBodySnippet,
        transportFlow,
      });
    }

    const buffer = await response.body();

    if (buffer.byteLength === 0) {
      throw new BrowserAssetTransportError({
        message: `Browser asset request returned an empty body for URL: ${requestUrl}`,
        requestUrl,
        status: response.status(),
        responseUrl: response.url(),
        responseBodySnippet,
        transportFlow,
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
      transportFlow,
    };
  }

  private async fetchAssetResponse(requestUrl: string): Promise<{
    response: Response;
    responseBodySnippet?: string;
    transportFlow: ProviderTransportFlow;
  }> {
    const initialResponse = await this.navigateToAsset(requestUrl);
    const initialResponseBodySnippet = await this.readResponseBodySnippet();
    const steps: ProviderTransportFlowStep[] = [
      {
        kind: 'request',
        label: 'request 1',
        url: requestUrl,
        status: initialResponse.status(),
        ok: initialResponse.ok(),
      },
    ];

    if (!this.shouldRecoverFrom403(initialResponse)) {
      return {
        response: initialResponse,
        responseBodySnippet: initialResponseBodySnippet,
        transportFlow: buildTransportFlow({ steps }),
      };
    }

    const retriedResponse = await this.navigateToAsset(requestUrl);
    const retriedResponseBodySnippet = await this.readResponseBodySnippet();
    steps.push({
      kind: 'request',
      label: 'request 2',
      url: requestUrl,
      status: retriedResponse.status(),
      ok: retriedResponse.ok(),
    });

    if (!this.shouldRecoverFrom403(retriedResponse) || !this.tournamentPublicUrl) {
      return {
        response: retriedResponse,
        responseBodySnippet: retriedResponseBodySnippet,
        transportFlow: buildTransportFlow({ steps }),
      };
    }

    const warmupStep = await this.warmTournamentContext({
      requestUrl,
    });
    steps.push(warmupStep);

    const warmedResponse = await this.navigateToAsset(requestUrl);
    const warmedResponseBodySnippet = await this.readResponseBodySnippet();
    steps.push({
      kind: 'request',
      label: 'request 3',
      url: requestUrl,
      status: warmedResponse.status(),
      ok: warmedResponse.ok(),
    });

    return {
      response: warmedResponse,
      responseBodySnippet: warmedResponseBodySnippet,
      transportFlow: buildTransportFlow({ steps }),
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

  private async warmTournamentContext(input: { requestUrl: string }): Promise<ProviderTransportFlowStep> {
    const tournamentPublicUrl = this.tournamentPublicUrl;

    if (!tournamentPublicUrl) {
      return {
        kind: 'warmup',
        label: 'warm-up',
        url: input.requestUrl,
        note: 'skipped',
      };
    }

    const page = this.session.getPage();

    try {
      await page.goto(tournamentPublicUrl, {
        waitUntil: 'load',
        timeout: 30_000,
      });

      return {
        kind: 'warmup',
        label: 'warm-up',
        url: tournamentPublicUrl,
      };
    } catch (error) {
      Logger.warn('SofaScore tournament warmup failed before retrying challenged asset request', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'transport',
        operation: 'BrowserAssetUploader.warmTournamentContext',
        requestUrl: input.requestUrl,
        tournamentPublicUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });

      return {
        kind: 'warmup',
        label: 'warm-up',
        url: tournamentPublicUrl,
        note: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private shouldRecoverFrom403(response: Response): boolean {
    return response.status() === 403;
  }

  private async readResponseBodySnippet(): Promise<string | undefined> {
    const page = this.session.getPage();
    const responseText = await page.evaluate(() => {
      const pre = document.querySelector('pre');
      return pre ? pre.textContent ?? '' : document.body.textContent ?? '';
    });

    return responseText.length > 0 ? responseText.slice(0, RESPONSE_BODY_SNIPPET_MAX_LENGTH) : undefined;
  }
}

const buildTransportFlow = (input: { steps: ProviderTransportFlowStep[] }): ProviderTransportFlow => {
  return {
    summary: input.steps
      .map(step => {
        if (step.kind === 'request') {
          return `${step.label} -> ${step.status ?? 'unknown'}`;
        }

        if (step.note) {
          return `${step.label} (${step.note})`;
        }

        return step.label;
      })
      .join(', '),
    steps: input.steps,
  };
};

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

  const detectedType = await FileType.fromBuffer(input.buffer);

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
