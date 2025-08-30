import { QUERIES_DATA_PROVIDER_REPORTS } from '@/domains/data-provider/queries/reports';
import { S3FileStorage } from '@/services/file-storage';
import { SlackMessage, slackNotifications } from '@/services/notifications/slack';
import { v4 as uuidv4 } from 'uuid';
import { Operation } from './operation';

export class DataProviderReport {
  public requestId: string;
  public reportUrl: string | null = null;
  public tournament: { label: string; id: string; provider?: string } | null = null;
  public operationType: string;
  private slackMessage: SlackMessage | null = null;
  public summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    standingsCounts?: {
      totalGroups?: number;
      groupsProcessed?: number;
      totalTeams?: number;
      totalStandingsCreated?: number;
    };
  } = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    standingsCounts: {},
  };

  private operations: Operation[] = [];

  constructor(operationType: string, requestId?: string) {
    this.operationType = operationType;
    this.requestId = requestId || uuidv4();
  }

  public setTournament(tournament: { label: string; id: string; provider?: string }) {
    this.tournament = {
      label: tournament.label,
      id: tournament.id,
      provider: tournament.provider,
    };
    return this;
  }

  public createOperation(type: string, name: string): Operation {
    const op = new Operation(type, name, this);
    this.operations.push(op);
    this.summary.totalOperations++;
    return op;
  }

  public onOperationSuccess(): void {
    this.summary.successfulOperations++;
  }

  public onOperationFailure(): void {
    this.summary.failedOperations++;
  }

  public getOperations(): Operation[] {
    return this.operations;
  }

  public getSummary() {
    return this.summary;
  }

  public setSlackMessage(message: SlackMessage): void {
    this.slackMessage = message;
  }

  public async uploadToS3(): Promise<void> {
    const reportData = this.toJSON();
    const jsonContent = JSON.stringify(reportData, null, 2);
    const filename = `${this.operationType}-${this.requestId}`;
    const s3Storage = new S3FileStorage();
    const key = await s3Storage.uploadFile({
      buffer: Buffer.from(jsonContent, 'utf8'),
      filename,
      contentType: 'application/json',
      directory: 'data-provider-operation-reports',
      cacheControl: 'max-age=604800, public', // 7 days cache
    });

    this.reportUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }

  public async uploadAndSave(): Promise<DataProviderReport> {
    if (!this.tournament) {
      throw new Error('Tournament must be set before saving to database');
    }
    // Upload to S3 first
    await this.uploadToS3();
    // Determine status based on operations
    const status = this.summary.failedOperations > 0 ? 'failed' : 'completed';
    // Save complete report to database
    await QUERIES_DATA_PROVIDER_REPORTS.createReport({
      requestId: this.requestId,
      tournamentId: this.tournament.id,
      operationType: this.operationType,
      status,
      reportFileUrl: this.reportUrl,
      reportFileKey: this.reportUrl?.split('/').pop() || '',
      summary: this.getSummary(),
    });

    return this;
  }

  public async sendSlackNotification(): Promise<void> {
    if (this.slackMessage) {
      await slackNotifications.sendCustomMessage(this.slackMessage);
    }
  }

  public toJSON() {
    return {
      requestId: this.requestId,
      tournament: this.tournament,
      operationType: this.operationType,
      summary: this.getSummary(),
      operations: this.operations.map(op => ({
        type: op.type,
        name: op.name,
        status: op.status,
        duration: op.duration,
        data: op.data,
        error: op.error,
      })),
    };
  }
}
