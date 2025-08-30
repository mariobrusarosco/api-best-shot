import { QUERIES_MATCH } from '@/domains/match/queries';
import { DB_InsertMatch, T_Match } from '@/domains/match/schema';
import { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { ENDPOINT_ROUND } from '../providers/sofascore_v2/schemas/endpoints';
import { DataProviderReport } from './reporter';
import { SlackMessage } from '@/services/notifications/slack';

const safeSofaDate = (date: unknown): Date | null => {
  return date === null || date === undefined ? null : new Date(date as string | number | Date);
};

export class MatchesDataProviderService {
  private scraper: BaseScraper;
  public report: DataProviderReport;

  constructor(report: DataProviderReport) {
    this.report = report;
    this.scraper = new BaseScraper();
  }

  static async create(report: DataProviderReport) {
    return new MatchesDataProviderService(report);
  }


  public async getTournamentMatchesByRound(round: DB_SelectTournamentRound): Promise<ENDPOINT_ROUND | null> {
    const op = this.report.createOperation('scraping', 'fetch_round_matches');

    try {
      await this.scraper.goto(round.providerUrl);
      const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

      if (!rawContent?.events || rawContent?.events?.length === 0) {
        op.success({
          roundSlug: round.slug,
          matchesCount: 0,
          note: 'No matches found',
        });
        return null;
      }

      const matches = this.mapMatches(rawContent, round.tournamentId, round.slug);

      op.success({
        roundSlug: round.slug,
        matchesCount: matches.length,
        rawEventsCount: rawContent.events.length,
      });

      return rawContent;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });
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
    const op = this.report.createOperation('scraping', 'fetch_tournament_matches');

    try {
      if (rounds.length === 0) {
        op.fail({ error: 'No rounds provided' });
        Profiling.error({
          source: 'MatchesDataProviderService.getTournamentMatches',
          error: new Error('No rounds provided, returning empty matches array'),
        });
        return [];
      }

      const roundsWithMatches: DB_InsertMatch[][] = [];
      let successfulRounds = 0;
      let failedRounds = 0;
      let roundsWithMatchesCount = 0;
      let roundsWithoutMatchesCount = 0;
      let totalMatchesScraped = 0;

      for (const round of rounds) {
        const roundOp = this.report.createOperation('scraping', 'process_round');

        try {
          await this.scraper.goto(round.providerUrl);
          const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

          if (!rawContent?.events || rawContent?.events?.length === 0) {
            roundOp.success({
              roundSlug: round.slug,
              matchesCount: 0,
              note: 'No matches found, skipping round',
            });
            roundsWithoutMatchesCount++;
            successfulRounds++;
            await this.scraper.sleep(2500);
            continue;
          }

          const matches = this.mapMatches(rawContent, tournamentId, round.slug);
          roundsWithMatches.push(matches);

          roundOp.success({
            roundSlug: round.slug,
            matchesCount: matches.length,
            rawEventsCount: rawContent.events.length,
          });

          roundsWithMatchesCount++;
          totalMatchesScraped += matches.length;
          successfulRounds++;
          await this.scraper.sleep(2500);
        } catch (roundError) {
          const errorMessage = (roundError as Error).message;
          failedRounds++;

          roundOp.fail({
            roundSlug: round.slug,
            roundLabel: round.label,
            providerUrl: round.providerUrl,
            error: errorMessage,
            note: 'Round failed but continuing with other rounds',
          });

          console.log(`[DEBUG] Match round ${round.slug} failed: ${errorMessage}`);
          roundsWithoutMatchesCount++;
          await this.scraper.sleep(2500);
          continue;
        }
      }

      const allMatches = roundsWithMatches.flat();
      op.success({
        totalMatches: allMatches.length,
        roundsProcessed: rounds.length,
        successfulRounds,
        failedRounds,
        roundsWithMatches: roundsWithMatchesCount,
        roundsWithoutMatches: roundsWithoutMatchesCount,
        totalMatchesScraped,
        note: `Processed ${successfulRounds}/${rounds.length} rounds successfully. ${failedRounds > 0 ? `${failedRounds} rounds failed but were skipped.` : ''}`,
      });

      return allMatches;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });
      Profiling.error({
        source: 'DATA_PROVIDER_MATCHES_getTournamentMatches',
        error: error as Error,
      });
      throw error;
    }
  }

  public mapMatches(rawContent: ENDPOINT_ROUND, tournamentId: string, roundSlug: string) {
    try {
      const matches = rawContent.events.map(event => {
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

  public getMatchStatus(match: ENDPOINT_ROUND['events'][number]) {
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

  public async createOnDatabase(matches: DB_InsertMatch[]) {
    const op = this.report.createOperation('database', 'create_matches');

    // Handle empty matches array gracefully
    if (matches.length === 0) {
      op.success({
        createdMatchesCount: 0,
        note: 'No matches to create - tournament rounds not available yet',
        matchIds: [],
      });
      return [];
    }

    try {
      const query = await db.insert(T_Match).values(matches).returning();

      op.success({
        createdMatchesCount: query.length,
        matchIds: query.map(m => m.id),
        tournamentId: matches[0]?.tournamentId,
      });

      return query;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_MATCHES_database_create',
      });
      throw error;
    }
  }

  public async updateOnDatabase(matches: DB_InsertMatch[]): Promise<unknown> {
    const op = this.report.createOperation('database', 'update_matches');

    if (matches.length === 0) {
      op.fail({ error: 'No matches to update' });
      Profiling.error({
        error: new Error('No matches to update in the database'),
        source: 'MatchesDataProviderService.updateOnDatabase',
      });
      return [];
    }

    try {
      const query = await QUERIES_MATCH.upsertMatches(matches);

      op.success({
        updatedMatchesCount: query.length,
        tournamentId: matches[0]?.tournamentId,
      });

      return query;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_MATCHES_database_update',
      });
      throw error;
    }
  }

  public async createMatches(
    rounds: DB_SelectTournamentRound[],
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    try {
      // Fetch and enhance matches
      const rawMatches = await this.getTournamentMatches(rounds, tournament.id);

      // Create matches in database
      const result = await this.createOnDatabase(rawMatches);

      // Update reporter with tournament info
      this.report.setTournament({
        label: tournament.label,
        id: tournament.id,
        provider: 'sofascore',
      });

      // Upload report and save to database
      await this.report.uploadToS3();
      await this.report.saveOnDatabase();

      // Send notification
      const slackMessage = this.createSuccessMessage(result, tournament, rawMatches);
      await this.report.sendNotification(slackMessage);

      // Close scraper
      await this.scraper.close();

      return result;
    } catch (error) {
      // Ensure we still save the report and send notification on failure
      await this.scraper.close();

      // Set tournament info for report if not set
      if (!this.report.tournament) {
        this.report.setTournament({
          label: tournament.label,
          id: tournament.id || '00000000-0000-0000-0000-000000000000',
          provider: 'sofascore',
        });
      }

      // Upload report and save to database even on failure
      await this.report.uploadToS3();
      await this.report.saveOnDatabase();

      // Send error notification
      const errorMessage = error instanceof Error ? error.message : String(error);
      const slackMessage = this.createErrorMessage(tournament, errorMessage);
      await this.report.sendNotification(slackMessage);

      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_createMatches',
        error: error instanceof Error ? error : new Error(errorMessage),
      });

      throw error;
    }
  }

  public async updateMatches(
    rounds: DB_SelectTournamentRound[],
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    try {
      // Fetch and enhance matches
      const rawMatches = await this.getTournamentMatches(rounds, tournament.id);

      // Update matches in database
      const result = await this.updateOnDatabase(rawMatches);

      // Update reporter with tournament info
      this.report.setTournament({
        label: tournament.label,
        id: tournament.id,
        provider: 'sofascore',
      });

      // Upload report and save to database
      await this.report.uploadToS3();
      await this.report.saveOnDatabase();

      // Send notification
      const slackMessage = this.createUpdateSuccessMessage(result, tournament, rawMatches);
      await this.report.sendNotification(slackMessage);

      // Close scraper
      await this.scraper.close();

      return result;
    } catch (error) {
      // Ensure we still save the report and send notification on failure
      await this.scraper.close();

      // Set tournament info for report if not set
      if (!this.report.tournament) {
        this.report.setTournament({
          label: tournament.label,
          id: tournament.id || '00000000-0000-0000-0000-000000000000',
          provider: 'sofascore',
        });
      }

      // Upload report and save to database even on failure
      await this.report.uploadToS3();
      await this.report.saveOnDatabase();

      // Send error notification
      const errorMessage = error instanceof Error ? error.message : String(error);
      const slackMessage = this.createErrorMessage(tournament, errorMessage);
      await this.report.sendNotification(slackMessage);

      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_updateMatches',
        error: error instanceof Error ? error : new Error(errorMessage),
      });

      throw error;
    }
  }

  private createSuccessMessage(
    matches: DB_InsertMatch[],
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>,
    rawMatches: DB_InsertMatch[]
  ): SlackMessage {
    return {
      text: `⚽ Matches Created`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚽ TOURNAMENT MATCHES CREATED',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${tournament.label}`,
            },
            {
              type: 'mrkdwn',
              text: `*Total Matches:* ${rawMatches.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Created Matches:* ${matches.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Operations:* ${this.report.summary.successfulOperations}/${this.report.summary.totalOperations} successful`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Report: <${this.report.reportUrl}|View Full Report>`,
            },
          ],
        },
      ],
    };
  }

  private createUpdateSuccessMessage(
    result: unknown,
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>,
    matches: DB_InsertMatch[]
  ): SlackMessage {
    return {
      text: `🔄 Matches Updated`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔄 TOURNAMENT MATCHES UPDATED',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${tournament.label}`,
            },
            {
              type: 'mrkdwn',
              text: `*Matches Updated:* ${matches.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Operations:* ${this.report.summary.successfulOperations}/${this.report.summary.totalOperations} successful`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Report: <${this.report.reportUrl}|View Full Report>`,
            },
          ],
        },
      ],
    };
  }

  private createErrorMessage(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>,
    errorMessage: string
  ): SlackMessage {
    return {
      text: `❌ Match Processing Failed`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ MATCH PROCESSING FAILED',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${tournament.label}`,
            },
            {
              type: 'mrkdwn',
              text: `*Error:* ${errorMessage}`,
            },
            {
              type: 'mrkdwn',
              text: `*Operations:* ${this.report.summary.failedOperations} failed, ${this.report.summary.successfulOperations} successful`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Report: <${this.report.reportUrl}|View Full Report>`,
            },
          ],
        },
      ],
    };
  }
}
