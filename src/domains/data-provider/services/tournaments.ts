import { eq, and } from 'drizzle-orm';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

import { S3FileStorage } from '../providers/file-storage';
import {
  T_Tournament,
  DB_InsertTournament,
  DB_UpdateTournament,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { Profiling } from '@/services/profiling';

type TournamentScrapingOperationData =
  | { tournamentId?: string; label?: string; provider?: string; note?: string }
  | { error: string; debugMessage?: string; errorMessage?: string }
  | { createdTournamentCount?: number; updatedTournamentCount?: number }
  | { tournamentExists?: boolean; existingTournament?: { id: string; label: string } }
  | Record<string, unknown>;

interface ScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: TournamentScrapingOperationData;
  timestamp: string;
}

interface TournamentOperationReport {
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

export class TournamentDataProviderService {
  private scraper: BaseScraper;
  private report: TournamentOperationReport;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
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

  private addOperation(
    step: string,
    operation: string,
    status: 'started' | 'completed' | 'failed',
    data?: TournamentScrapingOperationData
  ): void {
    this.report.operations.push({
      step,
      operation,
      status,
      data,
      timestamp: new Date().toISOString(),
    });

    this.report.summary.totalOperations++;
    if (status === 'completed') {
      this.report.summary.successfulOperations++;
    } else if (status === 'failed') {
      this.report.summary.failedOperations++;
    }
  }

  private async generateOperationReport(): Promise<void> {
    this.report.endTime = new Date().toISOString();
    const filename = `tournament-operation-${this.report.requestId}`;
    const jsonContent = JSON.stringify(this.report, null, 2);

    try {
      const isLocal = process.env.NODE_ENV === 'development';

      if (isLocal) {
        // Store locally for development
        const reportsDir = join(process.cwd(), 'data-provider-operation-reports');
        const filepath = join(reportsDir, `${filename}.json`);

        mkdirSync(reportsDir, { recursive: true });
        writeFileSync(filepath, jsonContent);

        Profiling.log({
          msg: `[INVOICE] Tournament scraping report generated successfully (local)`,
          data: { filepath, requestId: this.report.requestId },
          source: 'DATA_PROVIDER_V2_TOURNAMENT_generateOperationReport',
        });
      } else {
        // Store in S3 for demo/production environments
        const s3Storage = new S3FileStorage();
        const s3Key = await s3Storage.uploadFile({
          buffer: Buffer.from(jsonContent, 'utf8'),
          filename,
          contentType: 'application/json',
          directory: 'data-provider-operation-reports',
          cacheControl: 'max-age=604800, public', // 7 days cache
        });

        Profiling.log({
          msg: `[INVOICE] Tournament scraping report generated successfully (S3)`,
          data: { s3Key, requestId: this.report.requestId },
          source: 'DATA_PROVIDER_V2_TOURNAMENT_generateOperationReport',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TOURNAMENT_generateOperationReport',
        error: error instanceof Error ? error : new Error(errorMessage),
        data: { requestId: this.report.requestId, filename },
      });
      console.error('Failed to write tournament report file:', errorMessage);
    }
  }

  public async createOnDatabase(input: DB_InsertTournament) {
    this.addOperation('database', 'create_tournament', 'started', {
      externalId: input.externalId,
      label: input.label,
    });

    try {
      const tournament = await SERVICES_TOURNAMENT.createTournament(input);

      this.addOperation('database', 'create_tournament', 'completed', {
        tournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('database', 'create_tournament', 'failed', {
        error: errorMessage,
      });
      console.error('[SOFASCORE] - [ERROR] - [CREATE TOURNAMENT]', error);
      throw error;
    }
  }

  public async updateOnDatabase(data: DB_UpdateTournament) {
    this.addOperation('database', 'update_tournament', 'started', {
      externalId: data.externalId,
      provider: data.provider,
    });

    try {
      const [tournament] = await db
        .update(T_Tournament)
        .set(data)
        .where(
          and(
            eq(T_Tournament.externalId, data.externalId),
            eq(T_Tournament.provider, data.provider)
          )
        )
        .returning();

      this.addOperation('database', 'update_tournament', 'completed', {
        tournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('database', 'update_tournament', 'failed', {
        error: errorMessage,
      });
      console.error('[SOFASCORE] - [ERROR] - [UPDATE TOURNAMENT]', error);
      throw error;
    }
  }

  public getTournamentLogoUrl(tournamentId: string | number): string {
    return `https://api.sofascore.app/api/v1/unique-tournament/${tournamentId}/image/dark`;
  }

  public async init(payload: CreateTournamentInput) {
    // Initialize report tournament data
    this.report.tournament = {
      label: payload.label,
      tournamentId: payload.tournamentPublicId,
      provider: payload.provider,
    };

    this.addOperation('initialization', 'validate_input', 'started', {
      tournamentId: payload.tournamentPublicId,
    });

    if (!payload.tournamentPublicId) {
      this.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament public ID is null',
      });
      throw new Error(
        `[TournamentDataProviderService] - [ERROR] - [INIT] - [TOURNAMENT PUBLIC ID IS NULL]`
      );
    }

    this.addOperation('initialization', 'validate_input', 'completed', {
      tournamentId: payload.tournamentPublicId,
    });

    this.addOperation('scraping', 'fetch_logo', 'started', {
      tournamentId: payload.tournamentPublicId,
    });

    try {
      const logoUrl = this.getTournamentLogoUrl(payload.tournamentPublicId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `tournament-${payload.tournamentPublicId}`,
      });
      const logo = this.scraper.getCloudFrontUrl(s3Key);

      this.addOperation('scraping', 'fetch_logo', 'completed', { logoUrl: logo, s3Key });

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

      // Generate report file at the very end
      await this.generateOperationReport();

      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('scraping', 'fetch_logo', 'failed', { error: errorMessage });
      await this.generateOperationReport();
      throw error;
    }
  }
}
