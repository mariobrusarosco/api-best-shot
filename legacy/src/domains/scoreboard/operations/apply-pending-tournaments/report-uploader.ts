import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  TournamentScoreboardExecutionReport,
  TournamentScoreboardExecutionReportUploadResult,
} from '@/domains/scoreboard/contracts';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const TOURNAMENT_SCOREBOARD_EXECUTION_REPORT_DIRECTORY = 'scoreboard-operation-reports';

export const uploadTournamentScoreboardExecutionReport = async (
  report: TournamentScoreboardExecutionReport
): Promise<TournamentScoreboardExecutionReportUploadResult> => {
  const reportFilename = buildTournamentScoreboardExecutionReportFilename(report.requestId);
  const serializedReport = serializeTournamentScoreboardExecutionReport(report);

  try {
    const reportFileKey = await uploadTournamentScoreboardExecutionReportToS3({
      reportFilename,
      buffer: Buffer.from(serializedReport, 'utf8'),
    });
    const reportFileUrl = buildTournamentScoreboardExecutionReportUrl(reportFileKey);
    const reportAvailable = Boolean(reportFileUrl);

    return {
      reportUploadStatus: 'uploaded',
      reportAvailable,
      reportFileKey,
      reportFileUrl,
    };
  } catch (error: unknown) {
    const reportUploadError = error instanceof Error ? error.message : String(error);

    Logger.error(error as Error, {
      domain: DOMAINS.TOURNAMENT,
      component: 'scoreboard',
      requestId: report.requestId,
      tournamentId: report.tournament.tournamentId,
      operation: report.operationType,
      stage: 'report_upload',
      reportFilename: `${reportFilename}.json`,
      causeMessage: reportUploadError,
    });

    return {
      reportUploadStatus: 'failed',
      reportAvailable: false,
      reportUploadError,
    };
  }
};

const uploadTournamentScoreboardExecutionReportToS3 = async (input: {
  reportFilename: string;
  buffer: Buffer;
}): Promise<string> => {
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

  const reportFileKey = `${TOURNAMENT_SCOREBOARD_EXECUTION_REPORT_DIRECTORY}/${input.reportFilename}.json`;

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

const buildTournamentScoreboardExecutionReportUrl = (reportFileKey: string): string | undefined => {
  const cloudFrontDomain = (process.env.AWS_CLOUDFRONT_URL || '').trim();

  if (!cloudFrontDomain) {
    return undefined;
  }

  return `https://${cloudFrontDomain}/${reportFileKey}`;
};

const buildTournamentScoreboardExecutionReportFilename = (requestId: string): string => {
  return `tournament-scoreboard-execution-${requestId}`;
};

const serializeTournamentScoreboardExecutionReport = (report: TournamentScoreboardExecutionReport): string => {
  return JSON.stringify(report, null, 2);
};
