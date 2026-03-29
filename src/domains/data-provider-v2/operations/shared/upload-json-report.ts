import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { ReportUploadError } from '@/domains/data-provider-v2/contracts/errors';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const REPORT_DIRECTORY = 'data-provider-operation-reports';

export type JsonReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};

export const uploadJsonOperationReport = async (input: {
  report: unknown;
  requestId: string;
  operationType: string;
  tournamentId: string;
  failureMessage: string;
}): Promise<JsonReportUploadResult> => {
  const filename = `tournament-operation-${input.requestId}`;
  const reportFilename = `${filename}.json`;
  const jsonContent = JSON.stringify(input.report, null, 2);

  try {
    const reportFileKey = await uploadReportToS3({
      filename,
      buffer: Buffer.from(jsonContent, 'utf8'),
    });
    const reportFileUrl = buildCloudFrontUrl(reportFileKey);
    const reportAvailable = Boolean(reportFileUrl);

    return {
      reportUploadStatus: 'uploaded',
      reportAvailable,
      reportFileKey,
      reportFileUrl,
    };
  } catch (error: unknown) {
    const reportUploadError = new ReportUploadError({
      message: input.failureMessage,
      requestId: input.requestId,
      operationType: input.operationType,
      tournamentId: input.tournamentId,
      reportFilename,
      causeMessage: error instanceof Error ? error.message : String(error),
    });

    Logger.error(reportUploadError, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      operation: input.operationType,
      stage: 'report_upload',
      reportFilename,
      causeMessage: reportUploadError.causeMessage,
    });

    return {
      reportUploadStatus: 'failed',
      reportAvailable: false,
      reportUploadError: reportUploadError.message,
    };
  }
};

const uploadReportToS3 = async (input: { filename: string; buffer: Buffer }): Promise<string> => {
  const bucketName = (process.env.AWS_BUCKET_NAME || '').trim();
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not properly configured for report upload');
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const reportFileKey = `${REPORT_DIRECTORY}/${input.filename}.json`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: reportFileKey,
      Body: input.buffer,
      ContentType: 'application/json',
      CacheControl: 'max-age=604800, public',
      Expires: new Date(Date.now() + 604800 * 1000),
    })
  );

  return reportFileKey;
};

const buildCloudFrontUrl = (reportFileKey: string): string | undefined => {
  const cloudFrontDomain = (process.env.AWS_CLOUDFRONT_URL || '').trim();

  if (!cloudFrontDomain) {
    return undefined;
  }

  return `https://${cloudFrontDomain}/${reportFileKey}`;
};
