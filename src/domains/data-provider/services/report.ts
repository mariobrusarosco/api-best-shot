import { Profiling } from '@/services/profiling';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { S3FileStorage } from './file-storage';

type ScrapingOperationData =
  | { tournamentId?: string; label?: string; provider?: string; note?: string }
  | { error: string; debugMessage?: string; errorMessage?: string }
  | { createdTournamentCount?: number; updatedTournamentCount?: number }
  | { tournamentExists?: boolean; existingTournament?: { id: string; label: string } }
  | Record<string, unknown>;

interface ScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: ScrapingOperationData;
  timestamp: string;
}

interface OperationReport {
  requestId: string;
  tournament: {
    label: string;
    tournamentId: string;
    provider: string;
  };
  startTime: string;
  endTime?: string;
  operations: ScrapingOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
  };
}

export class DataProviderReport {
  private report: OperationReport;

  constructor(requestId: string) {
    this.report = {
      requestId,
      tournament: {
        label: '',
        tournamentId: '',
        provider: '',
      },
      startTime: new Date().toISOString(),
      operations: [],
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
      },
    };
  }

  public setTournamentInfo(tournament: { label: string; tournamentId: string; provider: string }) {
    this.report.tournament = tournament;

    // Automatically log the tournament setup as an operation
    this.addOperation('initialization', 'set_tournament_info', 'completed', {
      label: tournament.label,
      provider: tournament.provider,
    });

    return this; // Enable method chaining
  }

  public addOperation(
    step: string,
    operation: string,
    status: 'started' | 'completed' | 'failed',
    data?: ScrapingOperationData
  ) {
    // Automatically include tournamentId from the report's tournament info
    const operationData = this.report.tournament.tournamentId
      ? { tournamentId: this.report.tournament.tournamentId, ...data }
      : data;

    this.report.operations.push({
      step,
      operation,
      status,
      data: operationData,
      timestamp: new Date().toISOString(),
    });

    this.report.summary.totalOperations++;
    if (status === 'completed') {
      this.report.summary.successfulOperations++;
    } else if (status === 'failed') {
      this.report.summary.failedOperations++;
    }

    return this; // Enable method chaining
  }

  public getReport(): OperationReport {
    return this.report;
  }

  public getSummary() {
    return this.report.summary;
  }

  public async createFileAndUpload(): Promise<{ s3Key?: string; s3Url?: string }> {
    this.report.endTime = new Date().toISOString();
    const filename = `tournament-operation-${this.report.requestId}`;
    const jsonContent = JSON.stringify(this.report, null, 2);

    try {
      let s3Key: string | undefined;
      let s3Url: string | undefined;

      // Always attempt S3 upload first - S3FileStorage will validate credentials
      try {
        const s3Storage = new S3FileStorage();
        s3Key = await s3Storage.uploadFile({
          buffer: Buffer.from(jsonContent, 'utf8'),
          filename,
          contentType: 'application/json',
          directory: 'data-provider-operation-reports',
          cacheControl: 'max-age=604800, public', // 7 days cache
        });

        // Generate CloudFront URL using same method as logos
        const cloudFrontDomain = process.env.AWS_CLOUDFRONT_URL || '';
        s3Url = `https://${cloudFrontDomain}/${s3Key}`;

        Profiling.log({
          msg: `[REPORT] Operation report uploaded to S3 successfully`,
          data: { s3Key, s3Url, requestId: this.report.requestId },
          source: 'DATA_PROVIDER_REPORT_generateOperationReport',
        });
      } catch (s3Error) {
        Profiling.log({
          msg: `[REPORT] S3 upload failed, saving locally only`,
          data: { error: String(s3Error), requestId: this.report.requestId },
          source: 'DATA_PROVIDER_REPORT_generateOperationReport',
        });
        s3Key = undefined;
        s3Url = undefined;
      }

      // Always save locally (as backup in production, primary in development without AWS)
      const reportsDir = join(process.cwd(), 'data-provider-operation-reports');
      const filepath = join(reportsDir, `${filename}.json`);

      mkdirSync(reportsDir, { recursive: true });
      writeFileSync(filepath, jsonContent);

      const logMessage = s3Key
        ? `[REPORT] Operation report saved locally and uploaded to S3`
        : `[REPORT] Operation report saved locally only`;

      Profiling.log({
        msg: logMessage,
        data: { filepath, s3Key, requestId: this.report.requestId },
        source: 'DATA_PROVIDER_REPORT_generateOperationReport',
      });

      // Return S3 information for database storage (if available)
      return { s3Key, s3Url };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Profiling.error({
        source: 'DATA_PROVIDER_REPORT_generateOperationReport',
        error: error instanceof Error ? error : new Error(errorMessage),
        data: { requestId: this.report.requestId, filename },
      });
      console.error('Failed to write operation report file:', errorMessage);

      // Return empty object on error
      return {};
    }
  }
}
