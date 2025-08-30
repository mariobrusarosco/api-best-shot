import type {
  ENDPOINT_ROUND,
  ENDPOINT_STANDINGS,
  I_TEAM_FROM_ROUND,
} from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { QUERIES_TEAMS } from '@/domains/team/queries';
import { DB_InsertTeam } from '@/domains/team/schema';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Profiling } from '@/services/profiling';
import { SlackMessage } from '@/services/notifications/slack';
import { safeString, sleep } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { DataProviderReport } from './reporter';

export class TeamsDataProviderService {
  private scraper: BaseScraper;
  public report: DataProviderReport;

  constructor(report: DataProviderReport) {
    this.report = report;
    this.scraper = new BaseScraper();
  }

  static async create(report: DataProviderReport) {
    return new TeamsDataProviderService(report);
  }

  private getTeamLogoUrl(teamId: string | number): string {
    return `https://api.sofascore.app/api/v1/team/${teamId}/image`;
  }

  private async enhanceTeamWithLogo(team: DB_InsertTeam): Promise<DB_InsertTeam> {
    const op = this.report.createOperation('scraping', 'enhance_team_logo');

    try {
      const logoUrl = this.getTeamLogoUrl(team.externalId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `team-${team.externalId}`,
      });

      // Check if we got a dummy path (meaning the upload failed)
      if (s3Key.startsWith('dummy-path/')) {
        op.fail({
          error: `Failed to fetch team logo from SofaScore`,
          teamName: team.name,
          teamId: team.externalId,
          attemptedUrl: logoUrl,
          fallbackKey: s3Key,
        });
        throw new Error(`Failed to fetch team logo for ${team.name}`);
      }

      const enhancedTeam = {
        name: team.name,
        externalId: safeString(team.externalId) as string,
        shortName: team.shortName,
        badge: this.scraper.getCloudFrontUrl(s3Key),
        provider: 'sofa',
      } satisfies DB_InsertTeam;

      op.success({
        teamName: team.name,
        logoUrl: enhancedTeam.badge,
        s3Key,
      });

      return enhancedTeam;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (op.status !== 'failed') {
        op.fail({
          teamName: team.name,
          error: errorMessage,
        });
      }
      Profiling.error({
        source: 'TEAMS_SERVICE_enhanceTeamWithLogo',
        error:
          error instanceof Error ? error : new Error(`Failed to enhance team ${team.name} with logo: ${errorMessage}`),
      });
      throw error;
    }
  }

  public mapTeamsFromStandings(standingsResponse: ENDPOINT_STANDINGS): DB_InsertTeam[] {
    const groups = standingsResponse.standings.map(group => {
      const groupTeams = group.rows.map(row => {
        const team = row.team;
        return {
          externalId: team.id.toString(),
          name: team.name,
          shortName: team.shortName,
          slug: team.slug,
          nameCode: team.nameCode,
          provider: 'sofa',
          badge: '',
        };
      });
      return groupTeams;
    });

    const teams = groups.flat();

    Profiling.log({
      msg: '[SUCCESS] - MAPPED TEAMS FROM STANDINGS',
      source: 'DATA_PROVIDER_TEAMS_mapTeamsFromStandings',
      data: { teams },
    });

    return teams;
  }

  public mapTeamsFromRound(teams: I_TEAM_FROM_ROUND[]): DB_InsertTeam[] {
    return teams.map(team => {
      return {
        name: team.name,
        shortName: team.shortName,
        slug: team.slug,
        nameCode: team.nameCode,
        externalId: team.id.toString(),
        provider: 'sofa',
        badge: '',
      };
    });
  }

  public async fetchTeamsFromStandings(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<ENDPOINT_STANDINGS | null> {
    const op = this.report.createOperation('scraping', 'fetch_teams_standings');
    const url = `${tournament.baseUrl}/standings/total`;

    try {
      await this.scraper.goto(url);
      const fetchResult = (await this.scraper.getPageContent()) as ENDPOINT_STANDINGS;

      const teamsCount = fetchResult.standings.reduce((total, group) => total + group.rows.length, 0);
      op.success({
        url,
        teamsCount,
        groupsCount: fetchResult.standings.length,
      });

      return fetchResult;
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;

      // Handle 404 gracefully - standings might not exist yet for this tournament
      if (
        errorMessage.includes('status 404') ||
        errorMessage.includes('404') ||
        errorMessage.toLowerCase().includes('not found')
      ) {
        op.success({
          url,
          note: 'Standings not available yet (404) - will fetch teams from knockout rounds only',
          teamsCount: 0,
          groupsCount: 0,
        });
        return null; // Return null to indicate no standings available
      }

      // Handle browser/context closure errors - these should not fail the entire process
      if (
        errorMessage.includes('Target page, context or browser has been closed') ||
        errorMessage.includes('browser has been closed') ||
        errorMessage.includes('context has been closed')
      ) {
        op.success({
          url,
          note: 'Browser closed during standings fetch - will fetch teams from knockout rounds only',
          teamsCount: 0,
          groupsCount: 0,
        });
        return null; // Return null to indicate no standings available
      }

      // For other errors, fail the operation
      op.fail({
        error: errorMessage,
        url,
      });
      Profiling.error({
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromStandings',
        error: error,
      });
      throw error;
    }
  }

  public async fetchTeamsFromKnockoutRounds(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<I_TEAM_FROM_ROUND[]> {
    this.addOperation('scraping', 'fetch_teams_knockout', 'started', {
      tournamentId: tournament.id,
    });

    try {
      const rounds = await QUERIES_TOURNAMENT_ROUND.getKnockoutRounds(tournament.id);

      this.addOperation('database', 'get_knockout_rounds', 'completed', {
        roundsCount: rounds.length,
        rounds: rounds.map((round: { slug?: string; label?: string }) => round.slug || round.label),
      });

      const ALL_KNOCKOUT_TEAMS = [] as I_TEAM_FROM_ROUND[];
      const uniqueTeamIds = new Set<string>(); // Track unique team IDs for early deduplication
      let totalSkippedDuplicates = 0;

      let successfulRounds = 0;
      let failedRounds = 0;

      for (const round of rounds) {
        this.addOperation('scraping', 'fetch_round_teams', 'started', {
          roundSlug: round.slug,
          providerUrl: round.providerUrl,
        });

        try {
          await this.scraper.goto(round.providerUrl);
          const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

          if (!rawContent?.events || rawContent?.events?.length === 0) {
            this.addOperation('scraping', 'fetch_round_teams', 'completed', {
              roundSlug: round.slug,
              teamsCount: 0,
              note: 'No events found',
            });
            successfulRounds++;
            await sleep(2000);
            continue;
          }

          const roundMatches = rawContent.events;
          const roundTeams = roundMatches.flatMap(match => [match.homeTeam, match.awayTeam]);

          // Early deduplication: only add teams that haven't been seen before
          const newTeams = roundTeams.filter(team => {
            const teamId = team.id.toString();
            if (uniqueTeamIds.has(teamId)) {
              totalSkippedDuplicates++;
              return false;
            }
            uniqueTeamIds.add(teamId);
            return true;
          });

          this.addOperation('scraping', 'fetch_round_teams', 'completed', {
            roundSlug: round.slug,
            totalTeamsInRound: roundTeams.length,
            newUniqueTeams: newTeams.length,
            skippedDuplicates: roundTeams.length - newTeams.length,
            matchesCount: roundMatches.length,
          });

          ALL_KNOCKOUT_TEAMS.push(...newTeams);
          successfulRounds++;
          await sleep(2000);
        } catch (roundError) {
          const errorMessage = (roundError as Error).message;
          failedRounds++;

          // Log individual round failure but continue with other rounds
          this.addOperation('scraping', 'fetch_round_teams', 'failed', {
            roundSlug: round.slug,
            providerUrl: round.providerUrl,
            error: errorMessage,
            note: 'Round failed but continuing with other rounds',
          });

          console.log(`[DEBUG] Round ${round.slug} failed: ${errorMessage}`);
          await sleep(2000);
          continue;
        }
      }

      // Determine if we should consider this successful

      this.addOperation('scraping', 'fetch_teams_knockout', 'completed', {
        totalUniqueTeams: ALL_KNOCKOUT_TEAMS.length,
        totalSkippedDuplicates,
        roundsProcessed: rounds.length,
        successfulRounds,
        failedRounds,
        note: `Processed ${successfulRounds}/${rounds.length} rounds successfully. ${failedRounds > 0 ? `${failedRounds} rounds failed but were skipped.` : ''}`,
      });

      return ALL_KNOCKOUT_TEAMS;
    } catch (error: unknown) {
      // This catch should only handle unexpected errors that aren't individual round failures
      // since those are now handled within the loop
      const errorMessage = (error as Error).message;

      console.log('[DEBUG] fetchTeamsFromKnockoutRounds unexpected error:', errorMessage);

      this.addOperation('scraping', 'fetch_teams_knockout', 'failed', {
        error: errorMessage,
        note: 'Unexpected error in knockout rounds processing',
      });

      Profiling.error({
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromKnockoutRounds',
        error: error,
      });
      throw error;
    }
  }

  public async createOnDatabase(teams: DB_InsertTeam[]) {
    const op = this.report.createOperation('database', 'create_teams');

    // Handle empty teams array gracefully
    if (teams.length === 0) {
      op.success({
        createdTeamsCount: 0,
        note: 'No teams to create - tournament data not available yet',
        teamIds: [],
      });
      return [];
    }

    try {
      const createdTeams = await QUERIES_TEAMS.createTeams(teams);

      op.success({
        createdTeamsCount: createdTeams.length,
        teamIds: createdTeams.map(t => t.id),
      });

      return createdTeams;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      op.fail({
        error: errorMessage,
      });

      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_TEAM_database',
      });

      throw error;
    }
  }

  public async upsertOnDatabase(teams: DB_InsertTeam[]): Promise<void> {
    const op = this.report.createOperation('database', 'upsert_teams');

    try {
      await QUERIES_TEAMS.updateTeams(teams);

      op.success({
        upsertedTeamsCount: teams.length,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      op.fail({
        error: errorMessage,
      });

      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'DATA_PROVIDER_V2_TEAM_upsert',
      });

      throw error;
    }
  }

  public async createTeams(tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>) {
    try {
      let mappedTeamsFromStandings: DB_InsertTeam[] = [];
      let mappedTeamsFromKnockoutRounds: DB_InsertTeam[] = [];

      // Fetch teams based on tournament mode
      if (tournament.mode === 'knockout-only') {
        // Only fetch from knockout rounds for knockout-only tournaments
        const teamsFromKnockoutRounds = await this.fetchTeamsFromKnockoutRounds(tournament);
        mappedTeamsFromKnockoutRounds = this.mapTeamsFromRound(teamsFromKnockoutRounds);
      } else {
        // Fetch from both standings and knockout rounds for regular tournaments
        const teamsFromStandings = await this.fetchTeamsFromStandings(tournament);

        // Handle case where standings don't exist yet (404)
        if (teamsFromStandings) {
          mappedTeamsFromStandings = this.mapTeamsFromStandings(teamsFromStandings);
        }

        const teamsFromKnockoutRounds = await this.fetchTeamsFromKnockoutRounds(tournament);
        mappedTeamsFromKnockoutRounds = this.mapTeamsFromRound(teamsFromKnockoutRounds);
      }

      // Deduplicate teams
      const allTeams = removeDuplicatesTeams(mappedTeamsFromStandings, mappedTeamsFromKnockoutRounds);

      // Enhance teams with logos
      const enhancedTeams = await this.enhanceTeamsWithLogos(allTeams);

      // Save to database
      let result;
      if (tournament.mode === 'knockout-only') {
        await this.upsertOnDatabase(enhancedTeams);
        result = enhancedTeams;
      } else {
        result = await this.createOnDatabase(enhancedTeams);
      }

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
      const slackMessage = this.createSuccessMessage(result, {
        fromStandings: mappedTeamsFromStandings.length,
        fromKnockout: mappedTeamsFromKnockoutRounds.length,
        afterDeduplication: allTeams.length,
        created: result.length,
      });
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
        source: 'DATA_PROVIDER_V2_TEAMS_createTeams',
        error: error instanceof Error ? error : new Error(errorMessage),
      });

      throw error;
    }
  }

  private async enhanceTeamsWithLogos(teams: DB_InsertTeam[]): Promise<DB_InsertTeam[]> {
    const enhancedTeams: DB_InsertTeam[] = [];
    const enhancedTeamIds = new Set<string>();

    for (const team of teams) {
      if (enhancedTeamIds.has(team.externalId)) {
        continue; // Skip duplicates
      }

      try {
        const enhancedTeam = await this.enhanceTeamWithLogo(team);
        enhancedTeams.push(enhancedTeam);
        enhancedTeamIds.add(team.externalId);
        await sleep(1000); // Rate limiting
      } catch (error: unknown) {
        // Continue with next team even if one fails
        Profiling.error({
          source: 'DATA_PROVIDER_TEAMS_enhanceTeamWithLogo',
          error: error instanceof Error ? error : new Error(`Failed to enhance team ${team.name}`),
        });
        continue;
      }
    }

    return enhancedTeams;
  }

  private createSuccessMessage(
    teams: DB_InsertTeam[],
    counts: { fromStandings: number; fromKnockout: number; afterDeduplication: number; created: number }
  ): SlackMessage {
    return {
      text: `⚽ Teams Created`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚽ TEAMS CREATED',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${this.report.tournament?.label}`,
            },
            {
              type: 'mrkdwn',
              text: `*Teams Created:* ${counts.created}`,
            },
            {
              type: 'mrkdwn',
              text: `*From Standings:* ${counts.fromStandings}`,
            },
            {
              type: 'mrkdwn',
              text: `*From Knockout:* ${counts.fromKnockout}`,
            },
            {
              type: 'mrkdwn',
              text: `*After Deduplication:* ${counts.afterDeduplication}`,
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
      text: `❌ Team Creation Failed`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ TEAM CREATION FAILED',
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

const removeDuplicatesTeams = (teamFromStandings: DB_InsertTeam[], teamFromKnockoutRounds: DB_InsertTeam[]) => {
  const uniqueTeamsMap = new Map<string, DB_InsertTeam>();

  // Add all teams, using externalId as the key for deduplication
  [...teamFromStandings, ...teamFromKnockoutRounds].forEach(team => {
    if (!uniqueTeamsMap.has(team.externalId)) {
      uniqueTeamsMap.set(team.externalId, team);
    }
  });

  return Array.from(uniqueTeamsMap.values());
};
