import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import type { ENDPOINT_ROUNDS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import db from '@/services/database';
import {
  DB_InsertTournamentRound,
  DB_UpdateTournamentRound,
} from '@/domains/tournament-round/schema';
import { T_TournamentRound } from '@/domains/tournament-round/schema';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { Profiling } from '@/services/profiling';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { S3FileStorage } from '../providers/file-storage';

type RoundScrapingOperationData =
  | { baseUrl?: string; tournamentId?: string; roundsCount?: number; note?: string }
  | { error: string; debugMessage?: string; errorMessage?: string }
  | { createdRoundsCount?: number; roundIds?: string[]; updatedRoundsCount?: number }
  | {
      totalRoundsProcessed?: number;
      roundsWithEvents?: number;
      roundsWithoutEvents?: number;
    }
  | Record<string, unknown>;

interface RoundOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: RoundScrapingOperationData;
  timestamp: string;
}

interface RoundOperationReport {
  requestId: string;
  tournament: {
    id: string;
    baseUrl: string;
  };
  operationType: 'create' | 'update';
  startTime: string;
  endTime?: string;
  operations: RoundOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
  };
}

export class RoundDataProviderService {
  private scraper: BaseScraper;
  private report: RoundOperationReport;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.report = {
      requestId,
      tournament: {
        id: '',
        baseUrl: '',
      },
      operationType: 'create',
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
    data?: RoundScrapingOperationData
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
    const filename = `rounds-operation-${this.report.requestId}`;
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
          msg: `[INVOICE] Tournament rounds scraping report generated successfully (local)`,
          data: { filepath, requestId: this.report.requestId },
          source: 'DATA_PROVIDER_V2_ROUNDS_generateOperationReport',
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
          msg: `[INVOICE] Tournament rounds scraping report generated successfully (S3)`,
          data: { s3Key, requestId: this.report.requestId },
          source: 'DATA_PROVIDER_V2_ROUNDS_generateOperationReport',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Profiling.error({
        source: 'DATA_PROVIDER_V2_ROUNDS_generateOperationReport',
        error: error instanceof Error ? error : new Error(errorMessage),
        data: { requestId: this.report.requestId, filename },
      });
      console.error('Failed to write rounds report file:', errorMessage);
    }
  }

  public async getTournamentRounds(baseUrl: string): Promise<ENDPOINT_ROUNDS> {
    this.addOperation('scraping', 'fetch_rounds', 'started', { baseUrl });

    try {
      const url = `${baseUrl}/rounds`;

      await this.scraper.goto(url);
      const content = await this.scraper.getPageContent();

      this.addOperation('scraping', 'fetch_rounds', 'completed', {
        url,
        roundsCount: content.rounds?.length || 0,
      });
      return content as ENDPOINT_ROUNDS;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('scraping', 'fetch_rounds', 'failed', { error: errorMessage });
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT ROUNDS]', error);
      throw error;
    }
  }

  public enhanceRounds(
    baseUrl: string,
    tournamentId: string,
    roundsResponse: ENDPOINT_ROUNDS
  ): DB_InsertTournamentRound[] {
    this.addOperation('transformation', 'enhance_rounds', 'started', {
      baseUrl,
      tournamentId,
      rawRoundsCount: roundsResponse.rounds.length,
    });

    try {
      const enhancedRounds = roundsResponse.rounds.map((round, index) => {
        const isSpecialRound = !!round?.prefix;
        const isKnockoutRound = !isSpecialRound && !!round?.name;
        const isRegularRound = !isSpecialRound && !isKnockoutRound;

        const order = index + 1;
        let endpoint = `${baseUrl}/events/round/${round.round}`;
        let slug = '';
        let label = '';

        if (isKnockoutRound) {
          endpoint += `/slug/${round.slug}`;
          slug += `${round.slug}`;
          label = round.name || order.toString();
        } else if (isSpecialRound) {
          endpoint += `/slug/${round.slug}/prefix/${round.prefix}`;
          slug += `${round.prefix}-${round.slug}`;
          label = round.prefix!;
        } else if (isRegularRound) {
          slug += round.round;
          label = round.round.toString();
        }

        return {
          providerUrl: endpoint,
          providerId: String(round.round),
          tournamentId: tournamentId,
          order: order.toString(),
          label: label,
          slug: slug.toLowerCase(),
          knockoutId: round.prefix,
          type: isKnockoutRound || isSpecialRound ? 'knockout' : 'season',
          name: round.name,
        } as DB_InsertTournamentRound;
      });

      this.addOperation('transformation', 'enhance_rounds', 'completed', {
        enhancedRoundsCount: enhancedRounds.length,
        roundTypes: {
          regular: enhancedRounds.filter(r => r.type === 'season').length,
          knockout: enhancedRounds.filter(r => r.type === 'knockout').length,
        },
      });

      return enhancedRounds;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('transformation', 'enhance_rounds', 'failed', {
        error: errorMessage,
      });
      console.error('[SOFASCORE] - [ERROR] - [ENHANCE TOURNAMENT ROUNDS]', error);
      throw error;
    }
  }

  public async createOnDatabase(roundsToInsert: DB_InsertTournamentRound[]) {
    this.addOperation('database', 'create_rounds', 'started', {
      roundsCount: roundsToInsert.length,
      tournamentId: roundsToInsert[0]?.tournamentId,
    });

    try {
      const rounds = await db
        .insert(T_TournamentRound)
        .values(roundsToInsert)
        .returning();

      this.addOperation('database', 'create_rounds', 'completed', {
        createdRoundsCount: rounds.length,
        roundIds: rounds.map(r => r.id),
      });

      return rounds;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('database', 'create_rounds', 'failed', { error: errorMessage });
      console.error(
        '[SOFASCORE] - [ERROR] - [CREATE TOURNAMENT ROUNDS ON DATABASE]',
        error
      );
      throw error;
    }
  }

  public async init(tournamentId: string, tournamentBaseUrl: string) {
    // Initialize report tournament data
    this.report.tournament = {
      id: tournamentId,
      baseUrl: tournamentBaseUrl,
    };
    this.report.operationType = 'create';

    this.addOperation('initialization', 'validate_input', 'started', {
      tournamentId,
      tournamentBaseUrl,
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', {
        tournamentId,
      });

      const rawRounds = await this.getTournamentRounds(tournamentBaseUrl);
      const enhancedRounds = this.enhanceRounds(
        tournamentBaseUrl,
        tournamentId,
        rawRounds
      );
      const query = await this.createOnDatabase(enhancedRounds);

      // Generate report file at the very end
      await this.generateOperationReport();

      return query;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('initialization', 'process_rounds', 'failed', {
        error: errorMessage,
      });
      await this.generateOperationReport();
      throw error;
    }
  }

  public async updateOnDatabase(
    roundsToUpdate: DB_UpdateTournamentRound[]
  ): Promise<unknown> {
    this.addOperation('database', 'update_rounds', 'started', {
      roundsCount: roundsToUpdate.length,
      tournamentId: roundsToUpdate[0]?.tournamentId,
    });

    if (roundsToUpdate.length === 0) {
      this.addOperation('database', 'update_rounds', 'failed', {
        error: 'No rounds to update',
      });
      Profiling.error({
        error: new Error('No rounds to update in the database'),
        source: 'RoundDataProviderService.updateOnDatabase',
      });
      return [];
    }

    try {
      const query = await QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds(roundsToUpdate);

      this.addOperation('database', 'update_rounds', 'completed', {
        updatedRoundsCount: roundsToUpdate.length,
      });

      return query;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('database', 'update_rounds', 'failed', { error: errorMessage });
      Profiling.error({
        error,
        source: 'RoundDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }

  public async updateTournament(
    tournamentId: string,
    tournamentBaseUrl: string
  ): Promise<unknown> {
    // Initialize report tournament data
    this.report.tournament = {
      id: tournamentId,
      baseUrl: tournamentBaseUrl,
    };
    this.report.operationType = 'update';

    this.addOperation('initialization', 'validate_input', 'started', {
      tournamentId,
      tournamentBaseUrl,
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', {
        tournamentId,
      });

      Profiling.log({
        msg: `[RoundDataProviderService] - Updating rounds for tournament: ${tournamentId}`,
      });

      const rawRounds = await this.getTournamentRounds(tournamentBaseUrl);
      const enhancedRounds = this.enhanceRounds(
        tournamentBaseUrl,
        tournamentId,
        rawRounds
      );
      const query = await this.updateOnDatabase(enhancedRounds);

      Profiling.log({
        msg: `[RoundDataProviderService] - Updated rounds for tournament: ${tournamentId}`,
        data: { rounds: enhancedRounds },
      });

      // Generate report file at the very end
      await this.generateOperationReport();

      return query;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('update', 'process_rounds', 'failed', { error: errorMessage });
      await this.generateOperationReport();
      Profiling.error({
        source: 'RoundDataProviderService.updateTournament',
        error,
      });
      throw error;
    }
  }
}
