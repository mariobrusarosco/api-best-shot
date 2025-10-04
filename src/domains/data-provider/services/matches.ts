import { QUERIES_MATCH } from '@/domains/match/queries';
import { DB_InsertMatch } from '@/domains/match/schema';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecutionOperationType } from '@/domains/data-provider/typing';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { DataProviderReport } from './reporter';

export interface CreateMatchesInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
}

const safeSofaDate = (date: unknown): Date | null => {
  return date === null || date === undefined ? null : new Date(date as string | number | Date);
};

export class MatchesDataProviderService {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(payload: CreateMatchesInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.MATCHES_CREATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH ROUNDS ------
      const rounds = await this.fetchRounds(payload.tournamentId);
      // ------ FETCH MATCHES ------
      const fetchedMatches = await this.fetchMatches(rounds, payload.baseUrl);
      // ------ CREATE MATCHES ------
      const createdMatches = await this.createOnDatabase(fetchedMatches);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          matchesCount: createdMatches.length,
          ...reportSummaryResult,
        },
      });

      return createdMatches;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS FAILED ------
      await this.execution?.failure({
        reportFileKey: reportUploadResult.s3Key,
        reportFileUrl: reportUploadResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          ...reportSummaryResult,
        },
      });

      throw error;
    }
  }

  public async update(payload: CreateMatchesInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.MATCHES_UPDATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH ROUNDS ------
      const rounds = await this.fetchRounds(payload.tournamentId);
      // ------ FETCH MATCHES ------
      const fetchedMatches = await this.fetchMatches(rounds, payload.baseUrl);
      // ------ UPDATE MATCHES ------
      const updatedMatches = await this.updateOnDatabase(fetchedMatches);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          matchesCount: updatedMatches.length,
          ...reportSummaryResult,
        },
      });

      return updatedMatches;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ MARK EXECUTION AS FAILED ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS FAILED ------
      await this.execution?.failure({
        reportFileKey: reportUploadResult.s3Key,
        reportFileUrl: reportUploadResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          ...reportSummaryResult,
        },
      });

      throw error;
    }
  }

  private validateTournament(payload: CreateMatchesInput) {
    // ------ INPUT VALIDATION ------
    this.reporter.addOperation('initialization', 'validate_input', 'started');

    // Validate input
    if (!payload.tournamentId) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament ID is null',
      });

      throw new Error('Tournament ID is null');
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');
  }

  private async fetchRounds(tournamentId: string) {
    this.reporter.addOperation('database', 'fetch_rounds', 'started');

    try {
      const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournamentId);

      if (!rounds || rounds.length === 0) {
        this.reporter.addOperation('database', 'fetch_rounds', 'completed', {
          note: 'No rounds found for tournament',
          roundsCount: 0,
        });
        return [];
      }

      this.reporter.addOperation('database', 'fetch_rounds', 'completed', {
        roundsCount: rounds.length,
      });

      return rounds;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('database', 'fetch_rounds', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  private async fetchMatches(rounds: any[], baseUrl: string) {
    this.reporter.addOperation('scraping', 'fetch_matches', 'started', {
      roundsCount: rounds.length,
    });

    try {
      if (rounds.length === 0) {
        this.reporter.addOperation('scraping', 'fetch_matches', 'completed', {
          note: 'No rounds to process',
          matchesCount: 0,
        });
        return [];
      }

      const allMatches: DB_InsertMatch[] = [];
      let successfulRounds = 0;
      let failedRounds = 0;

      for (const round of rounds) {
        try {
          const url = round.providerUrl;
          await this.scraper.goto(url);
          const rawContent = await this.scraper.getPageContent();

          if (!rawContent?.events || rawContent?.events?.length === 0) {
            this.reporter.addOperation('scraping', 'process_round', 'completed', {
              roundSlug: round.slug,
              matchesCount: 0,
              note: 'No matches found in round',
            });
            successfulRounds++;
            await this.scraper.sleep(2500);
            continue;
          }

          const matches = this.mapMatches(rawContent, round.tournamentId, round.slug);
          allMatches.push(...matches);

          this.reporter.addOperation('scraping', 'process_round', 'completed', {
            roundSlug: round.slug,
            matchesCount: matches.length,
          });

          successfulRounds++;
          await this.scraper.sleep(2500);
        } catch (roundError) {
          const errorMessage = (roundError as Error).message;
          failedRounds++;

          this.reporter.addOperation('scraping', 'process_round', 'failed', {
            roundSlug: round.slug,
            error: errorMessage,
            note: 'Round failed but continuing with other rounds',
          });

          await this.scraper.sleep(2500);
          continue;
        }
      }

      this.reporter.addOperation('scraping', 'fetch_matches', 'completed', {
        totalMatches: allMatches.length,
        roundsProcessed: rounds.length,
        successfulRounds,
        failedRounds,
      });

      return allMatches;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('scraping', 'fetch_matches', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  private mapMatches(rawContent: any, tournamentId: string, roundSlug: string): DB_InsertMatch[] {
    try {
      const matches = rawContent.events.map((event: any) => {
        return {
          externalId: safeString(event.id),
          provider: 'sofascore',
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

      return matches;
    } catch (error: unknown) {
      throw error;
    }
  }

  private getMatchStatus(match: any) {
    try {
      const matchWasPostponed = match.status.type === 'postponed';
      const matcheEnded = match.status.type === 'finished';

      if (matchWasPostponed) return 'not-defined';
      if (matcheEnded) return 'ended';
      return 'open';
    } catch (error: unknown) {
      throw error;
    }
  }

  public async createOnDatabase(matches: DB_InsertMatch[]) {
    this.reporter.addOperation('database', 'create_matches', 'started', {
      matchesCount: matches.length,
    });

    try {
      if (matches.length === 0) {
        this.reporter.addOperation('database', 'create_matches', 'completed', {
          createdMatchesCount: 0,
          note: 'No matches to create',
        });
        return [];
      }

      const query = await QUERIES_MATCH.createMatches(matches);

      this.reporter.addOperation('database', 'create_matches', 'completed', {
        createdMatchesCount: query.length,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'create_matches', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'MatchesDataProviderService.createOnDatabase',
      });
      throw error;
    }
  }

  public async updateOnDatabase(matches: DB_InsertMatch[]): Promise<DB_InsertMatch[]> {
    this.reporter.addOperation('database', 'update_matches', 'started', {
      matchesCount: matches.length,
    });

    if (matches.length === 0) {
      this.reporter.addOperation('database', 'update_matches', 'failed', {
        error: 'No matches to update',
      });
      const error = new Error('No matches to update in the database');
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.updateOnDatabase',
      });
      throw error;
    }

    try {
      const query = await QUERIES_MATCH.upsertMatches(matches);

      this.reporter.addOperation('database', 'update_matches', 'completed', {
        updatedMatchesCount: Array.isArray(query) ? query.length : 0,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'update_matches', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'MatchesDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }
}