import { QUERIES_MATCH } from '@/domains/match/queries';
import { DB_InsertMatch, T_Match } from '@/domains/match/schema';
import { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { API_SOFASCORE_ROUND } from '../typing';
import { S3FileStorage } from './file-storage';

const safeSofaDate = (date: unknown): Date | null => {
  return date === null || date === undefined ? null : new Date(date as string | number | Date);
};

type MatchesOperationData =
  | {
      url?: string;
      roundId?: string;
      roundSlug?: string;
      matchesCount?: number;
      note?: string;
    }
  | { error: string; debugMessage?: string; errorMessage?: string }
  | {
      tournamentId?: string;
      totalRoundsProcessed?: number;
      createdMatchesCount?: number;
      roundsWithMatches?: number;
      roundsWithoutMatches?: number;
    }
  | {
      totalMatchesScraped?: number;
      totalMatchesCreated?: number;
      roundsProcessed?: number;
    }
  | Record<string, unknown>;

interface MatchesOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: MatchesOperationData;
  timestamp: string;
}

interface MatchesOperationReport {
  requestId: string;
  tournament: {
    id: string;
    label: string;
  };
  operationType: 'create' | 'update';
  startTime: string;
  endTime?: string;
  operations: MatchesOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    matchCounts: {
      totalRoundsProcessed: number;
      totalMatchesScraped: number;
      totalMatchesCreated: number;
      roundsWithMatches: number;
      roundsWithoutMatches: number;
    };
  };
}

export class MatchesDataProviderService {
  private scraper: BaseScraper;
  private report: MatchesOperationReport;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.report = {
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
        matchCounts: {
          totalRoundsProcessed: 0,
          totalMatchesScraped: 0,
          totalMatchesCreated: 0,
          roundsWithMatches: 0,
          roundsWithoutMatches: 0,
        },
      },
    };
  }

  private addOperation(
    step: string,
    operation: string,
    status: 'started' | 'completed' | 'failed',
    data?: MatchesOperationData
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
    const filename = `matches-operation-${this.report.requestId}`;
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
          msg: `[REPORT] Matches operation report generated successfully (local)`,
          data: { filepath, requestId: this.report.requestId },
          source: 'DATA_PROVIDER_V2_MATCHES_generateOperationReport',
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
          msg: `[REPORT] Matches operation report generated successfully (S3)`,
          data: { s3Key, requestId: this.report.requestId },
          source: 'DATA_PROVIDER_V2_MATCHES_generateOperationReport',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_generateOperationReport',
        error: error instanceof Error ? error : new Error(errorMessage),
        data: { requestId: this.report.requestId, filename },
      });
      console.error('Failed to write matches operation report file:', errorMessage);
    }
  }

  public async getTournamentMatchesByRound(round: DB_SelectTournamentRound): Promise<API_SOFASCORE_ROUND | null> {
    this.addOperation('scraping', 'fetch_round_matches', 'started', {
      roundSlug: round.slug,
      providerUrl: round.providerUrl,
    });

    try {
      await this.scraper.goto(round.providerUrl);
      const rawContent = (await this.scraper.getPageContent()) as API_SOFASCORE_ROUND;

      if (!rawContent?.events || rawContent?.events?.length === 0) {
        this.addOperation('scraping', 'fetch_round_matches', 'completed', {
          roundSlug: round.slug,
          matchesCount: 0,
          note: 'No matches found',
        });
        this.report.summary.matchCounts.roundsWithoutMatches++;
        return null;
      }

      const matches = this.mapMatches(rawContent, round.tournamentId, round.slug);

      this.addOperation('scraping', 'fetch_round_matches', 'completed', {
        roundSlug: round.slug,
        matchesCount: matches.length,
        rawEventsCount: rawContent.events.length,
      });

      this.report.summary.matchCounts.roundsWithMatches++;
      this.report.summary.matchCounts.totalMatchesScraped += matches.length;

      return rawContent;
    } catch (error) {
      this.addOperation('scraping', 'fetch_round_matches', 'failed', {
        roundSlug: round.slug,
        error: (error as Error).message,
      });
      Profiling.error({
        source: 'DATA_PROVIDER_MATCHES_getTournamentMatchesByRound',
        error: error as Error,
      });
      throw error;
    }
  }

  public async getTournamentMatches(
    rounds: DB_SelectTournamentRound[],
    tournamentId: string
  ): Promise<DB_InsertMatch[]> {
    this.addOperation('scraping', 'fetch_tournament_matches', 'started', {
      tournamentId,
      roundsCount: rounds.length,
    });

    try {
      if (rounds.length === 0) {
        this.addOperation('scraping', 'fetch_tournament_matches', 'failed', {
          error: 'No rounds provided',
        });
        Profiling.error({
          source: 'MatchesDataProviderService.getTournamentMatches',
          error: new Error('No rounds provided, returning empty matches array'),
        });
        return [];
      }

      const roundsWithMatches: DB_InsertMatch[][] = [];

      let successfulRounds = 0;
      let failedRounds = 0;

      for (const round of rounds) {
        this.addOperation('scraping', 'process_round', 'started', {
          roundSlug: round.slug,
          roundLabel: round.label,
          providerUrl: round.providerUrl,
        });

        try {
          await this.scraper.goto(round.providerUrl);
          const rawContent = (await this.scraper.getPageContent()) as API_SOFASCORE_ROUND;

          if (!rawContent?.events || rawContent?.events?.length === 0) {
            this.addOperation('scraping', 'process_round', 'completed', {
              roundSlug: round.slug,
              matchesCount: 0,
              note: 'No matches found, skipping round',
            });
            this.report.summary.matchCounts.roundsWithoutMatches++;
            successfulRounds++;
            await this.scraper.sleep(2500);
            continue;
          }

          const matches = this.mapMatches(rawContent, tournamentId, round.slug);
          roundsWithMatches.push(matches);

          this.addOperation('scraping', 'process_round', 'completed', {
            roundSlug: round.slug,
            matchesCount: matches.length,
            rawEventsCount: rawContent.events.length,
          });

          this.report.summary.matchCounts.roundsWithMatches++;
          this.report.summary.matchCounts.totalMatchesScraped += matches.length;
          successfulRounds++;
          await this.scraper.sleep(2500);
        } catch (roundError) {
          const errorMessage = (roundError as Error).message;
          failedRounds++;

          // Log individual round failure but continue with other rounds
          this.addOperation('scraping', 'process_round', 'failed', {
            roundSlug: round.slug,
            roundLabel: round.label,
            providerUrl: round.providerUrl,
            error: errorMessage,
            note: 'Round failed but continuing with other rounds',
          });

          console.log(`[DEBUG] Match round ${round.slug} failed: ${errorMessage}`);
          this.report.summary.matchCounts.roundsWithoutMatches++;
          await this.scraper.sleep(2500);
          continue;
        }
      }

      this.report.summary.matchCounts.totalRoundsProcessed = rounds.length;

      const allMatches = roundsWithMatches.flat();
      this.addOperation('scraping', 'fetch_tournament_matches', 'completed', {
        totalMatches: allMatches.length,
        roundsProcessed: rounds.length,
        successfulRounds,
        failedRounds,
        roundsWithMatches: this.report.summary.matchCounts.roundsWithMatches,
        roundsWithoutMatches: this.report.summary.matchCounts.roundsWithoutMatches,
        note: `Processed ${successfulRounds}/${rounds.length} rounds successfully. ${failedRounds > 0 ? `${failedRounds} rounds failed but were skipped.` : ''}`,
      });

      return allMatches;
    } catch (error) {
      this.addOperation('scraping', 'fetch_tournament_matches', 'failed', {
        error: (error as Error).message,
      });
      Profiling.error({
        source: 'DATA_PROVIDER_MATCHES_getTournamentMatches',
        error: error as Error,
      });
      throw error;
    }
  }

  public mapMatches(rawContent: API_SOFASCORE_ROUND, tournamentId: string, roundSlug: string) {
    try {
      const matches = rawContent.events.map((event: API_SOFASCORE_ROUND['events'][number]) => {
        return {
          externalId: safeString(event.id),
          provider: 'sofa',
          tournamentId,
          roundSlug,
          homeTeamId: safeString(event.homeTeam.id),
          homeScore: safeString(event.homeScore.display, null),
          homePenaltiesScore: safeString(event.homeScore.penalties, null),
          awayTeamId: safeString(event.awayTeam.id),
          awayScore: safeString(event.awayScore.display, null),
          awayPenaltiesScore: safeString(event.awayScore.penalties, null),
          date: safeSofaDate(event.startTimestamp! * 1000),
          status: this.getMatchStatus(event),
        } as DB_InsertMatch;
      });

      return matches as DB_InsertMatch[];
    } catch (error: unknown) {
      console.error('[SOFASCORE] - [ERROR] - [MAP MATCHES]', error);
      throw error;
    }
  }

  public getMatchStatus(match: API_SOFASCORE_ROUND['events'][number]) {
    try {
      const matchWasPostponed = match.status.type === 'postponed';
      const matcheEnded = match.status.type === 'finished';

      if (matchWasPostponed) return 'not-defined';
      if (matcheEnded) return 'ended';
      return 'open';
    } catch (error: unknown) {
      console.error('[SOFASCORE] - [ERROR] - [GET MATCH STATUS]', error);
      throw error;
    }
  }

  async createOnDatabase(matches: DB_InsertMatch[]) {
    this.addOperation('database', 'create_matches', 'started', {
      matchesCount: matches.length,
    });

    // Handle empty matches array gracefully
    if (matches.length === 0) {
      this.addOperation('database', 'create_matches', 'completed', {
        createdMatchesCount: 0,
        note: 'No matches to create - tournament rounds not available yet',
        matchIds: [],
      });
      return [];
    }

    try {
      const query = await db.insert(T_Match).values(matches);

      this.addOperation('database', 'create_matches', 'completed', {
        createdMatchesCount: matches.length,
      });

      this.report.summary.matchCounts.totalMatchesCreated = matches.length;

      return query;
    } catch (error) {
      this.addOperation('database', 'create_matches', 'failed', {
        error: (error as Error).message,
      });
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.createOnDatabase',
      });
      throw error;
    }
  }

  async updateOnDatabase(matches: DB_InsertMatch[]) {
    this.addOperation('database', 'update_matches', 'started', {
      matchesCount: matches.length,
    });

    if (matches.length === 0) {
      this.addOperation('database', 'update_matches', 'failed', {
        error: 'No matches to update',
      });
      Profiling.error({
        error: new Error('No matches to update in the database'),
        source: 'MatchesDataProviderService.updateOnDatabase',
      });
      return 0;
    }

    try {
      const query = await QUERIES_MATCH.upsertMatches(matches);

      this.addOperation('database', 'update_matches', 'completed', {
        updatedMatchesCount: query.length,
      });

      return query.length;
    } catch (error) {
      this.addOperation('database', 'update_matches', 'failed', {
        error: (error as Error).message,
      });
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }

  public async init(
    rounds: DB_SelectTournamentRound[],
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    // Initialize report tournament data
    this.report.tournament = {
      id: tournament.id,
      label: tournament.label,
    };
    this.report.operationType = 'create';

    this.addOperation('initialization', 'validate_input', 'started', {
      tournamentId: tournament.id,
      tournamentLabel: tournament.label,
      roundsCount: rounds.length,
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', {
        tournamentId: tournament.id,
      });

      const rawMatches = await this.getTournamentMatches(rounds, tournament.id);
      const query = await this.createOnDatabase(rawMatches);

      // Generate invoice file at the very end
      await this.generateOperationReport();

      return query;
    } catch (error) {
      this.addOperation('initialization', 'process_matches', 'failed', {
        error: (error as Error).message,
      });
      await this.generateOperationReport();
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.init',
      });
      throw error;
    }
  }

  public async updateRound(round: DB_SelectTournamentRound) {
    // Initialize report for update operation
    this.report.tournament = {
      id: round.tournamentId,
      label: 'Tournament (Update Round)',
    };
    this.report.operationType = 'update';

    this.addOperation('initialization', 'validate_input', 'started', {
      roundId: round.id,
      roundSlug: round.slug,
      tournamentId: round.tournamentId,
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', {
        roundSlug: round.slug,
      });

      const rawMatches = await this.getTournamentMatchesByRound(round);
      if (!rawMatches) {
        await this.generateOperationReport();
        return [];
      }
      const matches = this.mapMatches(rawMatches, round.tournamentId, round.slug);
      const query = await this.updateOnDatabase(matches);

      // Generate invoice file at the very end
      await this.generateOperationReport();

      return query;
    } catch (error) {
      this.addOperation('update', 'process_round_matches', 'failed', {
        error: (error as Error).message,
      });
      await this.generateOperationReport();
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.updateRound',
      });
      throw error;
    }
  }
}
