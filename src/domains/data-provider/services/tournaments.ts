import { DB_InsertTournament, DB_UpdateTournament, T_Tournament } from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { and, eq } from 'drizzle-orm';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { DataProviderExecutionService } from './index';
import { DataProviderReportService } from './report';

export class TournamentDataProviderService {
  private scraper: BaseScraper;
  private reportService: DataProviderReportService;
  private requestId: string;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reportService = new DataProviderReportService(requestId);
  }

  public async createOnDatabase(input: DB_InsertTournament) {
    const reporter = this.reportService.addOperation('database', 'create_tournament', 'started', {
      externalId: input.externalId,
      label: input.label,
    });

    try {
      const tournament = await SERVICES_TOURNAMENT.createTournament(input);

      reporter.addOperation('database', 'create_tournament', 'completed', {
        createdTournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      reporter.addOperation('database', 'create_tournament', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
      });
      throw error;
    }
  }

  public async updateOnDatabase(data: DB_UpdateTournament) {
    const reporter = this.reportService.addOperation('database', 'update_tournament', 'started', {
      externalId: data.externalId,
      provider: data.provider,
    });

    try {
      const [tournament] = await db
        .update(T_Tournament)
        .set(data)
        .where(and(eq(T_Tournament.externalId, data.externalId), eq(T_Tournament.provider, data.provider)))
        .returning();

      reporter.addOperation('database', 'update_tournament', 'completed', {
        updatedTournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      reporter.addOperation('database', 'update_tournament', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_update',
      });
      throw error;
    }
  }

  public getTournamentLogoUrl(tournamentId: string | number): string {
    return `https://api.sofascore.app/api/v1/unique-tournament/${tournamentId}/image/dark`;
  }

  public async init(payload: CreateTournamentInput) {
    const startTime = Date.now();

    // Create execution tracking record at the start
    await DataProviderExecutionService.createExecution({
      requestId: this.requestId,
      tournamentId: '00000000-0000-0000-0000-000000000000', // Temporary UUID, will be updated after tournament creation
      operationType: 'tournament_create',
    });

    // Initialize report tournament data and start validation
    const reporter = this.reportService
      .setTournamentInfo({
        label: payload.label,
        tournamentId: payload.tournamentPublicId,
        provider: payload.provider,
      })
      .addOperation('initialization', 'validate_input', 'started');

    if (!payload.tournamentPublicId) {
      reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament public ID is null',
      });

      // Complete execution as failed for validation error
      const duration = Date.now() - startTime;
      const summary = reporter.getSummary();
      await DataProviderExecutionService.completeExecution(this.requestId, {
        status: 'failed',
        duration,
        summary: {
          error: 'Tournament public ID is null',
          operationsCount: summary.totalOperations,
          failedOperations: summary.failedOperations,
        },
      });

      await reporter.generateOperationReport();
      throw new Error(`[TournamentDataProviderService] - [ERROR] - [INIT] - [TOURNAMENT PUBLIC ID IS NULL]`);
    }

    reporter
      .addOperation('initialization', 'validate_input', 'completed')
      .addOperation('scraping', 'fetch_logo', 'started');

    try {
      const logoUrl = this.getTournamentLogoUrl(payload.tournamentPublicId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `tournament-${payload.tournamentPublicId}`,
      });
      const logo = this.scraper.getCloudFrontUrl(s3Key);

      reporter.addOperation('scraping', 'fetch_logo', 'completed', { logoUrl: logo, s3Key });

      Profiling.log({
        msg: `Created tournament logo: ${logo}....`,
        data: { logo },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_init',
      });

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

      // Generate report file
      const reportResult = await reporter.generateOperationReport();

      // Complete execution tracking with report information and correct tournament ID
      const duration = Date.now() - startTime;
      const summary = reporter.getSummary();

      // Only include report file fields if they have values
      const executionData: any = {
        status: 'completed',
        duration,
        summary: {
          tournamentId: tournament.id,
          tournamentLabel: tournament.label,
          provider: payload.provider,
          operationsCount: summary.totalOperations,
          successfulOperations: summary.successfulOperations,
          failedOperations: summary.failedOperations,
        },
      };

      // Only add report file fields if they exist
      if (reportResult.s3Key) {
        executionData.reportFileKey = reportResult.s3Key;
      }
      if (reportResult.s3Url) {
        executionData.reportFileUrl = reportResult.s3Url;
      }

      await DataProviderExecutionService.completeExecution(this.requestId, executionData);

      // Update execution record with actual tournament ID
      await DataProviderExecutionService.updateExecution(this.requestId, {
        tournamentId: tournament.id,
      });

      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      reporter.addOperation('scraping', 'fetch_logo', 'failed', { error: errorMessage });

      // Generate report file even on failure
      const reportResult = await reporter.generateOperationReport();

      // Complete execution tracking as failed
      const duration = Date.now() - startTime;
      const summary = reporter.getSummary();

      // Only include report file fields if they have values
      const executionData: any = {
        status: 'failed',
        duration,
        summary: {
          error: errorMessage,
          operationsCount: summary.totalOperations,
          failedOperations: summary.failedOperations + 1,
        },
      };

      // Only add report file fields if they exist
      if (reportResult.s3Key) {
        executionData.reportFileKey = reportResult.s3Key;
      }
      if (reportResult.s3Url) {
        executionData.reportFileUrl = reportResult.s3Url;
      }

      await DataProviderExecutionService.completeExecution(this.requestId, executionData);
      throw error;
    }
  }
}
