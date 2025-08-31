import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { DB_InsertTournamentStandings, T_TournamentStandings } from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { SlackMessage } from '@/services/notifications/slack';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { DataProviderReport } from './reporter';

export class StandingsDataProviderService {
  private scraper: BaseScraper;
  public report: DataProviderReport;

  constructor(scraper: BaseScraper, reporter: DataProviderReport) {
    this.scraper = scraper;
    this.report = reporter;
  }

  static async create(reporter: DataProviderReport): Promise<StandingsDataProviderService> {
    const scraper = await BaseScraper.createInstance();
    return new StandingsDataProviderService(scraper, reporter);
  }

  public async mapTournamentStandings(
    standingsResponse: ENDPOINT_STANDINGS,
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<DB_InsertTournamentStandings[]> {
    const mapStandingsOperation = this.report.createOperation('transformation', 'map_standings');
    try {
      const standings = standingsResponse.standings.map(group => {
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

        return {
          groupId: group.id,
          groupName: group.name,
          standings: groupsStandings,
        };
      });

      const results = standings.flatMap(group => group.standings) as DB_InsertTournamentStandings[];

      mapStandingsOperation.success({
        totalStandingsCreated: results.length,
        groupsProcessed: standings.length,
      });

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      mapStandingsOperation.fail({
        error: errorMessage,
      });
      throw error;
    }
  }

  public async fetchStandings(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<ENDPOINT_STANDINGS | null> {
    const getStandingsOperation = this.report.createOperation('scraping', 'fetch_standings');
    const url = `${tournament.baseUrl}/standings/total`;

    try {
      await this.scraper.goto(url);
      const rawContent = await this.scraper.getPageContent();

      if (!rawContent?.standings || rawContent?.standings?.length === 0) {
        getStandingsOperation.success({
          url,
          standingsCount: 0,
        });
        return null;
      }

      getStandingsOperation.success({
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
      getStandingsOperation.fail({
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
    const op = this.report.createOperation('database', 'insert_standings');

    try {
      const query = await db.insert(T_TournamentStandings).values(standings);
      op.success({
        queryCount: query.length,
      });
      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      op.fail({
        error: errorMessage,
      });
      throw error;
    }
  }

  public async updateOnDatabase(standings: DB_InsertTournamentStandings[]) {
    const op = this.report.createOperation('database', 'update_standings');
    if (standings.length === 0) {
      op.success({
        queryCount: 0,
      });
      return [];
    }

    try {
      const query = await QUERIES_TOURNAMENT.upsertTournamentStandings(standings);

      op.success({
        queryCount: query.length,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      op.fail({
        error: errorMessage,
      });
      throw error;
    }
  }

  public async createStandings(tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>) {
    try {
      const rawStandings = await this.fetchStandings(tournament);
      if (!rawStandings) return rawStandings;

      const mappedStandings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.createOnDatabase(mappedStandings);

      await this.report.uploadToS3();
      await this.report.saveOnDatabase();

      const slackMessage = this.createAndSetSlackMessage(tournament, mappedStandings);
      await this.report.sendNotification(slackMessage);
      this.scraper.close();

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_init',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public async updateStandings(tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>) {
    try {
      const rawStandings = await this.fetchStandings(tournament);
      if (!rawStandings) return rawStandings;

      const mappedStandings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.updateOnDatabase(mappedStandings);

      await this.report.uploadToS3();
      await this.report.saveOnDatabase();

      const slackMessage = this.createAndSetSlackMessage(tournament, mappedStandings);
      await this.report.sendNotification(slackMessage);
      this.scraper.close();

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_init',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public createErrorMessage(
    error: Error,
    context: { operation?: string; tournament?: string; requestId?: string }
  ): SlackMessage {
    const message: SlackMessage = {
      text: `🚨 Data Provider Error`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Data Provider Error',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Error:* ${error.message}`,
            },
            {
              type: 'mrkdwn',
              text: `*Operation:* ${context.operation || 'Unknown'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${context.tournament || 'Unknown'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Request ID:* ${context.requestId || 'Unknown'}`,
            },
          ],
        },
      ],
    };

    if (error.stack) {
      const truncatedStack = error.stack.substring(0, 500) + (error.stack.length > 500 ? '...' : '');
      message.blocks?.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${truncatedStack}\`\`\``,
        },
      });
    }

    return message;
  }

  public createAndSetSlackMessage(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>,
    standings: DB_InsertTournamentStandings[]
  ): SlackMessage {
    const message: SlackMessage = {
      text: `⚽ ${this.report.operationType} Complete`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `⚽ ${this.report.operationType} COMPLETE`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${tournament?.label}`,
            },
            {
              type: 'mrkdwn',
              text: `*Teams Processed:* ${standings.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Operations:* ${this.report.summary.successfulOperations}/${this.report.summary.totalOperations} successful`,
            },
            {
              type: 'mrkdwn',
              text: `*Provider:* SofaScore`,
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

    return message;
  }
}
