import { CreateTournamentInput } from '@/domains/data-provider/api/v2/tournament/typing';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { DataProviderReport } from '@/domains/data-provider/services/report';
import { DataProviderExecutionOperationType } from '@/domains/data-provider/typing';
import { DB_InsertTournament, DB_UpdateTournament, T_Tournament } from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
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
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
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

    // Create execution tracking record at the start (implicitly starts execution)
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: '00000000-0000-0000-0000-000000000000', // Temporary UUID, will be updated after tournament creation
      operationType: DataProviderExecutionOperationType.TOURNAMENT_CREATE,
    });

    // Initialize report tournament data and start validation
    this.reporter
      .setTournamentInfo({
        label: payload.label,
        tournamentId: payload.tournamentPublicId,
        provider: payload.provider,
      })
      .addOperation('initialization', 'validate_input', 'started');

    if (!payload.tournamentPublicId) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament public ID is null',
      });

      // Complete execution as failed for validation error
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      await this.execution?.failure({
        duration,
        tournamentLabel: payload.label,
        error: 'Tournament public ID is null',
        summary: {
          error: 'Tournament public ID is null',
          ...summary,
        },
      });

      await this.reporter.createFileAndUpload();
      throw new Error(`[TournamentDataProviderService] - [ERROR] - [INIT] - [TOURNAMENT PUBLIC ID IS NULL]`);
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');

    try {
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
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('scraping', 'fetch_logo', 'failed', { error: errorMessage });

      // Generate report file even on failure
      const reportResult = await this.reporter.createFileAndUpload();

      // Complete execution tracking as failed
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

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

      throw error;
    }
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
}
