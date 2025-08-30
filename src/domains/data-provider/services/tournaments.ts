import { DB_InsertTournament } from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { SlackMessage } from '@/services/notifications/slack';
import { Profiling } from '@/services/profiling';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { DataProviderReport } from './reporter';

export class TournamentDataProviderService {
  private scraper: BaseScraper;
  public report: DataProviderReport;

  constructor(report: DataProviderReport) {
    this.report = report;
    this.scraper = new BaseScraper();
  }

  static async create(report: DataProviderReport) {
    return new TournamentDataProviderService(report);
  }

  public async createOnDatabase(input: DB_InsertTournament) {
    const op = this.report.createOperation('database', 'create_tournament');

    try {
      const tournament = await SERVICES_TOURNAMENT.createTournament(input);

      op.success({
        createdTournamentId: tournament.id,
        label: tournament.label,
      });

      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });

      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
      });
      throw error;
    }
  }

  public getTournamentLogoUrl(tournamentId: string | number): string {
    return `https://api.sofascore.app/api/v1/unique-tournament/${tournamentId}/image/dark`;
  }

  public async createTournament(payload: CreateTournamentInput) {
    try {
      // Fetch and upload logo
      const logoUrl = await this.fetchAndUploadLogo(payload.tournamentPublicId);

      // Create tournament in database
      const tournament = await this.createOnDatabase({
        externalId: payload.tournamentPublicId,
        baseUrl: payload.baseUrl || '',
        provider: 'sofascore',
        season: payload.season || '',
        mode: payload.mode || 'league',
        label: payload.label,
        logo: logoUrl,
        standingsMode: payload.standingsMode || 'single',
        slug: payload.slug || '',
      });

      // Update reporter with actual tournament ID
      this.report.setTournament({
        label: tournament.label,
        id: tournament.id,
        provider: 'sofascore',
      });

      // Upload report and save to database
      await this.report.uploadToS3();
      await this.report.saveOnDatabase();

      // Send notification
      const slackMessage = this.createSlackMessage(tournament);
      await this.report.sendNotification(slackMessage);

      // Close scraper
      await this.scraper.close();

      return tournament;
    } catch (error) {
      // Ensure we still save the report and send notification on failure
      await this.scraper.close();
      
      // Set a temporary tournament info for the report if not set
      if (!this.report.tournament) {
        this.report.setTournament({
          label: payload.label,
          id: '00000000-0000-0000-0000-000000000000', // Use null UUID for failed creations
          provider: 'sofascore',
        });
      }
      
      // Upload report and save to database even on failure
      await this.report.uploadToS3();
      await this.report.saveOnDatabase();
      
      // Send error notification
      const errorMessage = error instanceof Error ? error.message : String(error);
      const slackMessage = this.createErrorSlackMessage(payload, errorMessage);
      await this.report.sendNotification(slackMessage);
      
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  private createErrorSlackMessage(payload: CreateTournamentInput, errorMessage: string): SlackMessage {
    return {
      text: `❌ Tournament Creation Failed`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ TOURNAMENT CREATION FAILED',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${payload.label}`,
            },
            {
              type: 'mrkdwn',
              text: `*Public ID:* ${payload.tournamentPublicId}`,
            },
            {
              type: 'mrkdwn',
              text: `*Error:* ${errorMessage}`,
            },
            {
              type: 'mrkdwn',
              text: `*Operations:* ${this.report.summary.failedOperations} failed, ${this.report.summary.successfulOperations} successful`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Report: <${this.report.reportUrl}|View Full Report>`,
            },
          ],
        },
      ],
    };
  }

  private async fetchAndUploadLogo(tournamentPublicId: string): Promise<string> {
    const op = this.report.createOperation('scraping', 'fetch_logo');

    try {
      const logoUrl = this.getTournamentLogoUrl(tournamentPublicId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `tournament-${tournamentPublicId}`,
      });
      
      // Check if we got a dummy path (meaning the upload failed)
      if (s3Key.startsWith('dummy-path/')) {
        op.fail({ 
          error: 'Failed to fetch tournament logo from SofaScore',
          attemptedUrl: logoUrl,
          fallbackKey: s3Key 
        });
        throw new Error(`Failed to fetch tournament logo for ID: ${tournamentPublicId}`);
      }
      
      const cloudFrontUrl = this.scraper.getCloudFrontUrl(s3Key);

      op.success({ logoUrl: cloudFrontUrl, s3Key });

      return cloudFrontUrl;
    } catch (error) {
      const errorMessage = (error as Error).message;
      // Only fail the operation if it hasn't been marked as failed already
      if (op.status !== 'failed') {
        op.fail({ error: errorMessage });
      }
      throw error;
    }
  }

  public createSlackMessage(tournament: any): SlackMessage {
    return {
      text: `🏆 Tournament Created`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🏆 TOURNAMENT CREATED',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${tournament.label}`,
            },
            {
              type: 'mrkdwn',
              text: `*ID:* ${tournament.id}`,
            },
            {
              type: 'mrkdwn',
              text: `*Provider:* SofaScore`,
            },
            {
              type: 'mrkdwn',
              text: `*Operations:* ${this.report.summary.successfulOperations}/${this.report.summary.totalOperations} successful`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Report: <${this.report.reportUrl}|View Full Report>`,
            },
          ],
        },
      ],
    };
  }
}
