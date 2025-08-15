import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import {
  DB_InsertTournamentStandings,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { S3FileStorage } from '../providers/file-storage';
import { ServiceLogger } from '@/services/profiling/logger';

type ScrapingOperationData =
  | {
      url?: string;
      tournamentId?: string;
      groupsCount?: number;
      standingsCount?: number;
      note?: string;
    }
  | { error: string; debugMessage?: string }
  | {
      groupId?: string | number;
      groupName?: string;
      teamsInGroup?: number;
      standingsCreated?: number;
    }
  | {
      totalStandingsCreated?: number;
      groupsProcessed?: number;
      createdStandingsCount?: number;
      updatedStandingsCount?: number;
      standingsCount?: number;
    }
  | Record<string, unknown>;

interface StandingsScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: ScrapingOperationData;
  timestamp: string;
}

interface StandingsScrapingInvoice {
  requestId: string;
  tournament: {
    id: string;
    label: string;
  };
  operationType: 'create' | 'update';
  startTime: string;
  endTime?: string;
  operations: StandingsScrapingOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    standingsCounts: {
      totalGroups: number;
      totalTeams: number;
      totalStandingsCreated: number;
      groupsProcessed: number;
    };
  };
}

export class StandingsDataProviderService {
  private scraper: BaseScraper;
  private invoice: StandingsScrapingInvoice;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.invoice = {
      requestId,
      tournament: {
        id: '',
        label: '',
      },
      operationType: 'create',
      startTime: new Date().toISOString(),
      operations: [],
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        standingsCounts: {
          totalGroups: 0,
          totalTeams: 0,
          totalStandingsCreated: 0,
          groupsProcessed: 0,
        },
      },
    };
  }

  private addOperation(
    step: string,
    operation: string,
    status: 'started' | 'completed' | 'failed',
    data?: ScrapingOperationData
  ): void {
    this.invoice.operations.push({
      step,
      operation,
      status,
      data,
      timestamp: new Date().toISOString(),
    });

    this.invoice.summary.totalOperations++;
    if (status === 'completed') {
      this.invoice.summary.successfulOperations++;
    } else if (status === 'failed') {
      this.invoice.summary.failedOperations++;
    }
  }

  private async generateInvoiceFile(): Promise<void> {
    this.invoice.endTime = new Date().toISOString();
    const filename = `standings-scraping-${this.invoice.requestId}`;
    const jsonContent = JSON.stringify(this.invoice, null, 2);

    try {
      const isLocal = process.env.NODE_ENV === 'development';

      if (isLocal) {
        // Store locally for development
        const reportsDir = join(process.cwd(), 'tournament-scraping-reports');
        const filepath = join(reportsDir, `${filename}.json`);

        mkdirSync(reportsDir, { recursive: true });
        writeFileSync(filepath, jsonContent);

        ServiceLogger.success('GENERATE', 'REPORTS', {
          filepath,
          requestId: this.invoice.requestId,
          storageType: 'local',
        });
      } else {
        // Store in S3 for demo/production environments
        const s3Storage = new S3FileStorage();
        const s3Key = await s3Storage.uploadFile({
          buffer: Buffer.from(jsonContent, 'utf8'),
          filename,
          contentType: 'application/json',
          directory: 'tournament-scraping-reports',
          cacheControl: 'max-age=604800, public', // 7 days cache
        });

        ServiceLogger.success('GENERATE', 'REPORTS', {
          s3Key,
          requestId: this.invoice.requestId,
          storageType: 'S3',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ServiceLogger.error(
        'GENERATE',
        error instanceof Error ? error : new Error(errorMessage),
        'REPORTS',
        {
          requestId: this.invoice.requestId,
          filename,
        }
      );
      console.error('Failed to write standings invoice file:', errorMessage);
    }
  }

  public async mapTournamentStandings(
    standingsResponse: ENDPOINT_STANDINGS,
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<DB_InsertTournamentStandings[]> {
    this.addOperation('transformation', 'map_standings', 'started', {
      tournamentId: tournament.id,
      groupsCount: standingsResponse.standings.length,
    });

    try {
      const standings = standingsResponse.standings.map(group => {
        this.addOperation('transformation', 'process_group', 'started', {
          groupId: group.id,
          groupName: group.name,
          teamsInGroup: group.rows.length,
        });

        const groupsStandings = group.rows.map(row => ({
          teamExternalId: safeString(row.team.id),
          tournamentId: tournament.id,
          order: safeString(row.position),
          groupName: group.name,
          shortName: safeString(row.team.shortName),
          longName: safeString(row.team.name),
          points: safeString(row.points),
          games: safeString(row.matches),
          wins: safeString(row.wins),
          draws: safeString(row.draws),
          losses: safeString(row.losses),
          gf: safeString(row.scoresFor),
          ga: safeString(row.scoresAgainst),
          gd: row.scoreDiffFormatted,
          provider: 'sofascore',
        }));

        this.addOperation('transformation', 'process_group', 'completed', {
          groupId: group.id,
          groupName: group.name,
          standingsCreated: groupsStandings.length,
        });

        this.invoice.summary.standingsCounts.groupsProcessed++;
        this.invoice.summary.standingsCounts.totalTeams += groupsStandings.length;

        return {
          groupId: group.id,
          groupName: group.name,
          standings: groupsStandings,
        };
      });

      const results = standings.flatMap(
        group => group.standings
      ) as DB_InsertTournamentStandings[];

      this.invoice.summary.standingsCounts.totalGroups =
        standingsResponse.standings.length;

      this.addOperation('transformation', 'map_standings', 'completed', {
        totalStandingsCreated: results.length,
        groupsProcessed: standings.length,
      });

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addOperation('transformation', 'map_standings', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_mapTournamentStandings',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public async getStandings(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<ENDPOINT_STANDINGS | null> {
    const url = `${tournament.baseUrl}/standings/total`;
    this.addOperation('scraping', 'fetch_standings', 'started', {
      tournamentId: tournament.id,
      url,
    });

    try {
      await this.scraper.goto(url);
      const rawContent = await this.scraper.getPageContent();

      if (!rawContent?.standings || rawContent?.standings?.length === 0) {
        this.addOperation('scraping', 'fetch_standings', 'completed', {
          url,
          standingsCount: 0,
          note: 'No standings data found',
        });
        return null;
      }

      this.addOperation('scraping', 'fetch_standings', 'completed', {
        url,
        groupsCount: rawContent.standings.length,
        totalTeamsInStandings: rawContent.standings.reduce(
          (total: number, group: { rows: unknown[] }) => total + group.rows.length,
          0
        ),
      });

      return rawContent;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addOperation('scraping', 'fetch_standings', 'failed', {
        url,
        error: errorMessage,
      });
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_getStandings',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public async createOnDatabase(standings: DB_InsertTournamentStandings[]) {
    this.addOperation('database', 'create_standings', 'started', {
      standingsCount: standings.length,
    });

    try {
      const query = await db.insert(T_TournamentStandings).values(standings);

      this.addOperation('database', 'create_standings', 'completed', {
        createdStandingsCount: standings.length,
      });

      this.invoice.summary.standingsCounts.totalStandingsCreated = standings.length;

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addOperation('database', 'create_standings', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  public async updateOnDatabase(standings: DB_InsertTournamentStandings[]) {
    this.addOperation('database', 'update_standings', 'started', {
      standingsCount: standings.length,
    });

    if (standings.length === 0) {
      this.addOperation('database', 'update_standings', 'failed', {
        error: 'No standings to update',
      });
      Profiling.error({
        error: new Error('No standings to update in the database'),
        source: 'StandingsDataProviderService.updateOnDatabase',
      });
      return [];
    }

    try {
      const query = await QUERIES_TOURNAMENT.upsertTournamentStandings(standings);

      this.addOperation('database', 'update_standings', 'completed', {
        updatedStandingsCount: query.length,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addOperation('database', 'update_standings', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'StandingsDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }

  public async init(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    // Initialize invoice tournament data
    this.invoice.tournament = {
      id: tournament.id,
      label: tournament.label,
    };
    this.invoice.operationType = 'create';

    this.addOperation('initialization', 'validate_input', 'started', {
      tournamentId: tournament.id,
      tournamentLabel: tournament.label,
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', {
        tournamentId: tournament.id,
      });

      const rawStandings = await this.getStandings(tournament);

      if (!rawStandings) {
        this.addOperation('initialization', 'process_standings', 'completed', {
          note: 'No standings data available for tournament',
        });
        await this.generateInvoiceFile();
        return [];
      }

      const standings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.createOnDatabase(standings);

      // Generate invoice file at the very end
      await this.generateInvoiceFile();

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addOperation('initialization', 'process_standings', 'failed', {
        error: errorMessage,
      });
      await this.generateInvoiceFile();
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_init',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public async updateTournament(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    // Initialize invoice tournament data
    this.invoice.tournament = {
      id: tournament.id,
      label: tournament.label,
    };
    this.invoice.operationType = 'update';

    this.addOperation('initialization', 'validate_input', 'started', {
      tournamentId: tournament.id,
      tournamentLabel: tournament.label,
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', {
        tournamentId: tournament.id,
      });

      const rawStandings = await this.getStandings(tournament);

      if (!rawStandings) {
        this.addOperation('update', 'process_standings', 'completed', {
          note: 'No standings data found for tournament',
        });
        await this.generateInvoiceFile();
        return [];
      }

      const standings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.updateOnDatabase(standings);

      // Generate invoice file at the very end
      await this.generateInvoiceFile();

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addOperation('update', 'process_standings', 'failed', {
        error: errorMessage,
      });
      await this.generateInvoiceFile();
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_updateTournament',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }
}
