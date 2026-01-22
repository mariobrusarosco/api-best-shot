import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { DataProviderExecutionOperationType } from '@/domains/data-provider/typing';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { DB_InsertMatch } from '@/domains/match/schema';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { DataProviderReport } from './report';

export interface CreateMatchesInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
}

export interface UpdateRoundMatchesInput {
  tournamentId: string;
  roundSlug: string;
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

      // ------ GENERATE REPORT EVEN ON FAILURE (with fallback) ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Profiling.error({
          error: reportError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_INIT_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
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
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Profiling.error({
          error: notificationError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_INIT_notification_failed',
        });
      }

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

      // ------ GENERATE REPORT EVEN ON FAILURE (with fallback) ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Profiling.error({
          error: reportError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_UPDATE_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
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
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Profiling.error({
          error: notificationError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_UPDATE_notification_failed',
        });
      }

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

  private async fetchMatches(rounds: unknown[], _baseUrl: string) {
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

      for (const roundItem of rounds) {
        const round = roundItem as {
          providerUrl: string;
          slug: string;
          tournamentId: string;
        };
        try {
          const url = round.providerUrl;
          await this.scraper.goto(url);
          const rawContent = await this.scraper.getPageContent();

          if (!rawContent?.events || rawContent?.events?.length === 0) {
            this.reporter.addOperation('scraping', 'process_round', 'completed', {
              roundSlug: round.slug,
              providerUrl: url,
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
            providerUrl: url,
            matchesCount: matches.length,
          });

          successfulRounds++;
          await this.scraper.sleep(2500);
        } catch (roundError) {
          const errorMessage = (roundError as Error).message;
          failedRounds++;

          this.reporter.addOperation('scraping', 'process_round', 'failed', {
            roundSlug: round.slug,
            providerUrl: round.providerUrl,
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

  private mapMatches(rawContent: unknown, tournamentId: string, roundSlug: string): DB_InsertMatch[] {
    const matches = (rawContent as { events: unknown[] }).events.map((event: unknown) => {
      const eventData = event as {
        id: unknown;
        homeTeam: { id: unknown };
        homeScore: { display: unknown; penalties: unknown };
        awayTeam: { id: unknown };
        awayScore: { display: unknown; penalties: unknown };
        startTimestamp: number;
      };
      return {
        externalId: safeString(eventData.id),
        provider: 'sofascore',
        tournamentId,
        roundSlug,
        homeTeamId: safeString(eventData.homeTeam.id),
        homeScore: safeString(eventData.homeScore.display, null),
        homePenaltiesScore: safeString(eventData.homeScore.penalties, null),
        awayTeamId: safeString(eventData.awayTeam.id),
        awayScore: safeString(eventData.awayScore.display, null),
        awayPenaltiesScore: safeString(eventData.awayScore.penalties, null),
        date: safeSofaDate(eventData.startTimestamp * 1000),
        status: this.getMatchStatus(eventData),
      } as DB_InsertMatch;
    });

    return matches;
  }

  private getMatchStatus(match: unknown) {
    const matchData = match as { status: { type: string } };
    const matchWasPostponed = matchData.status.type === 'postponed';
    const matcheEnded = matchData.status.type === 'finished';

    if (matchWasPostponed) return 'not-defined';
    if (matcheEnded) return 'ended';
    return 'open';
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

  public async updateRound(payload: UpdateRoundMatchesInput) {
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
      this.validateRoundSlug(payload.roundSlug);
      // ------ FETCH SPECIFIC ROUND ------
      const round = await this.getRoundFromDatabase(payload.tournamentId, payload.roundSlug);
      // ------ FETCH MATCHES FOR ROUND ------
      const fetchedMatches = await this.fetchMatches([round], payload.baseUrl);
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
          roundSlug: payload.roundSlug,
          matchesCount: updatedMatches.length,
          ...reportSummaryResult,
        },
      });

      return updatedMatches;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE (with fallback) ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Profiling.error({
          error: reportError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_UPDATE_ROUND_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
        await this.execution?.failure({
          reportFileKey: reportUploadResult.s3Key,
          reportFileUrl: reportUploadResult.s3Url,
          tournamentLabel: payload.label,
          error: errorMessage,
          summary: {
            error: errorMessage,
            roundSlug: payload.roundSlug,
            ...reportSummaryResult,
          },
        });
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Profiling.error({
          error: notificationError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_UPDATE_ROUND_notification_failed',
        });
      }

      throw error;
    }
  }

  private validateRoundSlug(roundSlug: string) {
    this.reporter.addOperation('initialization', 'validate_round_slug', 'started');

    if (!roundSlug) {
      this.reporter.addOperation('initialization', 'validate_round_slug', 'failed', {
        error: 'Round slug is null',
      });
      throw new Error('Round slug is null');
    }

    this.reporter.addOperation('initialization', 'validate_round_slug', 'completed', {
      roundSlug,
    });
  }

  private async getRoundFromDatabase(tournamentId: string, roundSlug: string) {
    this.reporter.addOperation('database', 'fetch_round', 'started', {
      tournamentId,
      roundSlug,
    });

    try {
      const round = await QUERIES_TOURNAMENT_ROUND.getRound(tournamentId, roundSlug);

      if (!round) {
        this.reporter.addOperation('database', 'fetch_round', 'failed', {
          error: 'Round not found',
          tournamentId,
          roundSlug,
        });
        throw new Error(`Round "${roundSlug}" not found for tournament "${tournamentId}"`);
      }

      this.reporter.addOperation('database', 'fetch_round', 'completed', {
        roundId: round.id,
        roundSlug: round.slug,
      });

      return round;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('database', 'fetch_round', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Update a single match using SofaScore's match-specific API
   * Much more efficient than updating entire rounds
   */
  public async updateSingleMatch(payload: {
    matchExternalId: string;
    tournamentId: string;
    roundSlug: string;
    label: string;
    provider: string;
  }) {
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
      // ------ FETCH SINGLE MATCH FROM API ------
      this.reporter.addOperation('scraping', 'fetch_single_match', 'started', {
        matchExternalId: payload.matchExternalId,
      });

      const rawMatchData = await this.scraper.getMatchData(payload.matchExternalId);

      if (!rawMatchData?.event) {
        this.reporter.addOperation('scraping', 'fetch_single_match', 'failed', {
          error: 'No event data returned from API',
          matchExternalId: payload.matchExternalId,
        });
        throw new Error(`No event data for match ${payload.matchExternalId}`);
      }

      this.reporter.addOperation('scraping', 'fetch_single_match', 'completed', {
        matchExternalId: payload.matchExternalId,
      });

      // ------ MAP TO DB SCHEMA ------
      const match = this.mapSingleMatch(rawMatchData.event, payload.tournamentId, payload.roundSlug);

      // ------ UPDATE IN DATABASE ------
      const updatedMatches = await this.updateOnDatabase([match]);

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
          matchExternalId: payload.matchExternalId,
          matchesCount: 1,
          ...reportSummaryResult,
        },
      });

      return updatedMatches[0];
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Profiling.error({
          error: reportError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_UPDATE_SINGLE_MATCH_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
        await this.execution?.failure({
          reportFileKey: reportUploadResult.s3Key,
          reportFileUrl: reportUploadResult.s3Url,
          tournamentLabel: payload.label,
          error: errorMessage,
          summary: {
            error: errorMessage,
            matchExternalId: payload.matchExternalId,
            ...reportSummaryResult,
          },
        });
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Profiling.error({
          error: notificationError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'MATCHES_DATA_PROVIDER_UPDATE_SINGLE_MATCH_notification_failed',
        });
      }

      throw error;
    }
  }

  /**
   * Map a single match from SofaScore API response to DB schema
   */
  private mapSingleMatch(
    eventData: {
      id: unknown;
      homeTeam: { id: unknown };
      homeScore?: { display: unknown; penalties: unknown };
      awayTeam: { id: unknown };
      awayScore?: { display: unknown; penalties: unknown };
      startTimestamp: number;
      status: { type: string };
    },
    tournamentId: string,
    roundSlug: string
  ): DB_InsertMatch {
    return {
      externalId: safeString(eventData.id),
      provider: 'sofascore',
      tournamentId,
      roundSlug,
      homeTeamId: safeString(eventData.homeTeam.id),
      homeScore: safeString(eventData.homeScore?.display, null),
      homePenaltiesScore: safeString(eventData.homeScore?.penalties, null),
      awayTeamId: safeString(eventData.awayTeam.id),
      awayScore: safeString(eventData.awayScore?.display, null),
      awayPenaltiesScore: safeString(eventData.awayScore?.penalties, null),
      date: safeSofaDate(eventData.startTimestamp * 1000),
      status: this.getMatchStatus(eventData),
    } as DB_InsertMatch;
  }
}
