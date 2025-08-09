import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import {
  DB_InsertTournamentStandings,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import { safeString } from '@/utils';
import db from '@/services/database';
import Profiling from '@/services/profiling';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface StandingsScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: any;
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
    data?: any
  ) {
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

  private generateInvoiceFile() {
    this.invoice.endTime = new Date().toISOString();
    const filename = `standings-scraping-${this.invoice.requestId}.json`;
    const filepath = join(process.cwd(), 'tournament-scraping-reports', filename);

    try {
      writeFileSync(filepath, JSON.stringify(this.invoice, null, 2));
      Profiling.log({
        msg: `[INVOICE] Standings scraping report generated successfully`,
        data: { filepath, requestId: this.invoice.requestId },
        source: 'DATA_PROVIDER_V2_STANDINGS_generateInvoiceFile',
      });
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_generateInvoiceFile',
        error: error as Error,
      });
      console.error('Failed to write standings invoice file:', error);
    }
  }

  public async mapTournamentStandings(
    standingsResponse: ENDPOINT_STANDINGS,
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    this.addOperation('transformation', 'map_standings', 'started', {
      tournamentId: tournament.id,
      groupsCount: standingsResponse.standings.length,
    });

    try {
      const standings = standingsResponse.standings.map((group, index) => {
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
    } catch (error) {
      this.addOperation('transformation', 'map_standings', 'failed', {
        error: (error as Error).message,
      });
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_mapTournamentStandings',
        error,
      });
      throw error;
    }
  }

  public async getStandings(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
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
          (total: number, group: any) => total + group.rows.length,
          0
        ),
      });

      return rawContent;
    } catch (error) {
      this.addOperation('scraping', 'fetch_standings', 'failed', {
        url,
        error: (error as Error).message,
      });
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_getStandings',
        error,
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
    } catch (error) {
      this.addOperation('database', 'create_standings', 'failed', {
        error: (error as Error).message,
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
    } catch (error) {
      this.addOperation('database', 'update_standings', 'failed', {
        error: (error as Error).message,
      });
      Profiling.error({
        error,
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
        this.generateInvoiceFile();
        return [];
      }

      const standings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.createOnDatabase(standings);

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return query;
    } catch (error) {
      this.addOperation('initialization', 'process_standings', 'failed', {
        error: (error as Error).message,
      });
      this.generateInvoiceFile();
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_init',
        error,
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
        this.generateInvoiceFile();
        return [];
      }

      const standings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.updateOnDatabase(standings);

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return query;
    } catch (error) {
      this.addOperation('update', 'process_standings', 'failed', {
        error: (error as Error).message,
      });
      this.generateInvoiceFile();
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_updateTournament',
        error,
      });
      throw error;
    }
  }
}
