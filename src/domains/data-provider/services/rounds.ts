import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import type { ENDPOINT_ROUNDS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import {
  DB_InsertTournamentRound,
  DB_UpdateTournamentRound,
  T_TournamentRound,
} from '@/domains/tournament-round/schema';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { SlackMessage } from '@/services/notifications/slack';
import { DataProviderReport } from './reporter';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

export class RoundDataProviderService {
  private scraper: BaseScraper;
  public report: DataProviderReport;

  constructor(scraper: BaseScraper, report: DataProviderReport) {
    this.scraper = scraper;
    this.report = report;
  }

  static async create(report: DataProviderReport) {
    const scraper = await BaseScraper.createInstance();
    return new RoundDataProviderService(scraper, report);
  }

  public async getTournamentRounds(baseUrl: string): Promise<ENDPOINT_ROUNDS> {
    const op = this.report.createOperation('scraping', 'fetch_rounds');

    try {
      const url = `${baseUrl}/rounds`;

      await this.scraper.goto(url);
      const content = await this.scraper.getPageContent();

      op.success({
        url,
        roundsCount: content.rounds?.length || 0,
      });

      return content as ENDPOINT_ROUNDS;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });
      Profiling.error({
        source: 'DATA_PROVIDER_ROUNDS_getTournamentRounds',
        error: error as Error,
      });
      throw error;
    }
  }

  public enhanceRounds(
    baseUrl: string,
    tournamentId: string,
    roundsResponse: ENDPOINT_ROUNDS
  ): DB_InsertTournamentRound[] {
    const op = this.report.createOperation('transformation', 'enhance_rounds');

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

      const roundTypes = {
        regular: enhancedRounds.filter(r => r.type === 'season').length,
        knockout: enhancedRounds.filter(r => r.type === 'knockout').length,
      };

      op.success({
        enhancedRoundsCount: enhancedRounds.length,
        roundTypes,
        baseUrl,
        tournamentId,
      });

      return enhancedRounds;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });
      Profiling.error({
        source: 'DATA_PROVIDER_ROUNDS_enhanceRounds',
        error: error as Error,
      });
      throw error;
    }
  }

  public async createOnDatabase(roundsToInsert: DB_InsertTournamentRound[]) {
    const op = this.report.createOperation('database', 'create_rounds');

    try {
      const rounds = await db.insert(T_TournamentRound).values(roundsToInsert).returning();

      op.success({
        createdRoundsCount: rounds.length,
        roundIds: rounds.map(r => r.id),
        tournamentId: roundsToInsert[0]?.tournamentId,
      });

      return rounds;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });

      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_ROUNDS_database_create',
      });

      throw error;
    }
  }

  public async updateOnDatabase(roundsToUpdate: DB_UpdateTournamentRound[]): Promise<unknown> {
    const op = this.report.createOperation('database', 'update_rounds');

    if (roundsToUpdate.length === 0) {
      op.fail({ error: 'No rounds to update' });
      Profiling.error({
        error: new Error('No rounds to update in the database'),
        source: 'RoundDataProviderService.updateOnDatabase',
      });
      return [];
    }

    try {
      const query = await QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds(roundsToUpdate);

      op.success({
        updatedRoundsCount: roundsToUpdate.length,
        tournamentId: roundsToUpdate[0]?.tournamentId,
      });

      return query;
    } catch (error) {
      const errorMessage = (error as Error).message;
      op.fail({ error: errorMessage });

      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_ROUNDS_database_update',
      });

      throw error;
    }
  }

  public async createRounds(tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>) {
    try {
      // Fetch and enhance rounds
      const rawRounds = await this.getTournamentRounds(tournament.baseUrl);
      const enhancedRounds = this.enhanceRounds(tournament.baseUrl, tournament.id, rawRounds);

      // Create rounds in database
      const result = await this.createOnDatabase(enhancedRounds);

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
      const slackMessage = this.createSuccessMessage(result, tournament);
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
        source: 'DATA_PROVIDER_V2_ROUNDS_createRounds',
        error: error instanceof Error ? error : new Error(errorMessage),
      });

      throw error;
    }
  }

  public async updateRounds(tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>) {
    try {
      // Fetch and enhance rounds
      const rawRounds = await this.getTournamentRounds(tournament.baseUrl);
      const enhancedRounds = this.enhanceRounds(tournament.baseUrl, tournament.id, rawRounds);

      // Update rounds in database
      const result = await this.updateOnDatabase(enhancedRounds);

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
      const slackMessage = this.createUpdateSuccessMessage(result, tournament, enhancedRounds);
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
        source: 'DATA_PROVIDER_V2_ROUNDS_updateRounds',
        error: error instanceof Error ? error : new Error(errorMessage),
      });

      throw error;
    }
  }

  private createSuccessMessage(
    rounds: DB_InsertTournamentRound[],
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): SlackMessage {
    const roundTypes = {
      regular: rounds.filter(r => r.type === 'season').length,
      knockout: rounds.filter(r => r.type === 'knockout').length,
    };

    return {
      text: `🗓️ Rounds Created`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🗓️ TOURNAMENT ROUNDS CREATED',
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
              text: `*Total Rounds:* ${rounds.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Regular Season:* ${roundTypes.regular}`,
            },
            {
              type: 'mrkdwn',
              text: `*Knockout:* ${roundTypes.knockout}`,
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
    rounds: DB_UpdateTournamentRound[]
  ): SlackMessage {
    const roundTypes = {
      regular: rounds.filter(r => r.type === 'season').length,
      knockout: rounds.filter(r => r.type === 'knockout').length,
    };

    return {
      text: `🔄 Rounds Updated`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔄 TOURNAMENT ROUNDS UPDATED',
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
              text: `*Rounds Updated:* ${rounds.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Regular Season:* ${roundTypes.regular}`,
            },
            {
              type: 'mrkdwn',
              text: `*Knockout:* ${roundTypes.knockout}`,
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
      text: `❌ Round Processing Failed`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ ROUND PROCESSING FAILED',
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
