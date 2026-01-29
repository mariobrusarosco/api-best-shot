import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { DataProviderReport } from '@/domains/data-provider/services/report';
import { CreateTournamentInput, DataProviderExecutionOperationType } from '@/domains/data-provider/typing';
import { DB_InsertTournament, DB_UpdateTournament, T_Tournament } from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import { and, eq } from 'drizzle-orm';

export class TournamentDataProvider {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
    this.execution = null;
  }

  public async createOnDatabase(input: DB_InsertTournament) {
    this.reporter.addOperation('database', 'create_tournament', 'started', {
      externalId: input.externalId,
      label: input.label,
    });

    try {
      const tournament = await SERVICES_TOURNAMENT.createTournament(input);

      this.reporter.addOperation('database', 'create_tournament', 'completed', {
        createdTournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('database', 'create_tournament', 'failed', {
        error: errorMessage,
      });
      Logger.error(new Error(errorMessage), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'createOnDatabase',
      });
      throw error;
    }
  }

  public async updateOnDatabase(data: DB_UpdateTournament) {
    this.reporter.addOperation('database', 'update_tournament', 'started', {
      externalId: data.externalId,
      provider: data.provider,
    });

    try {
      const [tournament] = await db
        .update(T_Tournament)
        .set(data)
        .where(and(eq(T_Tournament.externalId, data.externalId), eq(T_Tournament.provider, data.provider)))
        .returning();

      this.reporter.addOperation('database', 'update_tournament', 'completed', {
        updatedTournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('database', 'update_tournament', 'failed', {
        error: errorMessage,
      });
      Logger.error(new Error(errorMessage), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'updateOnDatabase',
      });
      throw error;
    }
  }

  public getTournamentLogoUrl(tournamentId: string | number): string {
    return `https://api.sofascore.app/api/v1/unique-tournament/${tournamentId}/image/dark`;
  }

  private async uploadTournamentLogo(tournamentId: string) {
    this.reporter.addOperation('scraping', 'tournament_logo', 'started');
    const logoUrl = this.getTournamentLogoUrl(tournamentId);
    const s3Key = await this.scraper.uploadAsset({
      logoUrl,
      filename: `tournament-${tournamentId}`,
    });
    const logo = this.scraper.getCloudFrontUrl(s3Key);

    this.reporter.addOperation('scraping', 'tournament_logo', 'completed', {
      logoUrl: logo,
      s3Key,
    });

    return logo;
  }

  private validateTournament(payload: CreateTournamentInput) {
    // ------ INPUT VALIDATION ------
    this.reporter.addOperation('initialization', 'validate_input', 'started');
    // Validate input
    if (!payload.tournamentPublicId) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament ID is null',
      });

      throw new Error('Tournament ID is null');
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');
  }

  public async init(payload: CreateTournamentInput) {
    const startTime = Date.now();

    try {
      // ------ CREATE EXECUTION TRACKING RECORD AT THE START (IMPLICITLY STARTS EXECUTION) ------
      this.execution = new DataProviderExecution({
        requestId: this.requestId,
        tournamentId: '00000000-0000-0000-0000-000000000000', // Temporary UUID, will be updated after tournament creation
        operationType: DataProviderExecutionOperationType.TOURNAMENT_CREATE,
      });

      // ------ INITIALIZE REPORT TOURNAMENT DATA ------
      this.reporter.setTournamentInfo({
        label: payload.label,
        tournamentId: payload.tournamentPublicId,
        provider: payload.provider,
      });
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);

      const logo = await this.uploadTournamentLogo(payload.tournamentPublicId);
      const tournament = await this.createOnDatabase({
        externalId: payload.tournamentPublicId,
        baseUrl: payload.baseUrl,
        provider: 'sofascore',
        season: payload.season,
        mode: payload.mode,
        label: payload.label,
        logo,
        standingsMode: payload.standingsMode,
        slug: payload.slug,
      });

      // Update execution with actual tournament ID
      await this.execution?.updateTournamentId(tournament.id);

      // Generate report file
      const reportUpload = await this.reporter.createFileAndUpload();

      // Complete execution tracking with report information and correct tournament ID
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      await this.execution?.complete({
        reportFileKey: reportUpload?.s3Key,
        reportFileUrl: reportUpload?.s3Url,
        tournamentLabel: tournament.label,
        summary: {
          tournamentId: tournament.id,
          tournamentLabel: tournament.label,
          provider: payload.provider,
          ...summary,
        },
        duration,
      });

      return tournament;
    } catch (error) {
      console.log('------error payload:', payload);
      console.log('------payload type:', typeof payload);
      console.log('------payload keys:', payload ? Object.keys(payload) : 'no keys');
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT FILE EVEN ON FAILURE (with fallback) ------
      let reportResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Logger.error(reportError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'init',
          context: 'report_upload_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      // ------ COMPLETE EXECUTION TRACKING AS FAILED (always notify) ------
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      try {
        await this.execution?.failure({
          reportFileKey: reportResult.s3Key,
          reportFileUrl: reportResult.s3Url,
          tournamentLabel: payload.label,
          error: errorMessage,
          summary: {
            error: errorMessage,
            ...summary,
          },
          duration,
        });
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Logger.error(notificationError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'init',
          context: 'notification_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      throw error;
    }
  }
}
