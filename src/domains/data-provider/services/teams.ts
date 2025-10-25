import { DataProviderReport } from '@/domains/data-provider/services/report';
import { QUERIES_TEAMS } from '@/domains/team/queries';
import { DB_InsertTeam } from '@/domains/team/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import type { TournamentMode } from '@/domains/tournament/typing';
import { TournamentWithTypedMode } from '@/domains/tournament/typing';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { API_SOFASCORE_ROUND, API_SOFASCORE_STANDINGS, DataProviderExecutionOperationType } from '../typing';
import { DataProviderExecution } from './execution';

export interface CreateTeamsInput {
  tournamentId: string;
}

export class TeamsDataProviderService {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(input: CreateTeamsInput) {
    // ------ INPUT VALIDATION ------
    this.validateTournament(input);
    // ------ FETCH TOURNAMENT ------
    const tournament = await SERVICES_TOURNAMENT.getTournament(input.tournamentId);
    if (!tournament) throw new Error(`[TeamsDataProviderService] - [ERROR] - [INIT] - [TOURNAMENT NOT FOUND]`);

    try {
      // ------ CREATE EXECUTION TRACKING ------
      this.execution = new DataProviderExecution({
        requestId: this.requestId,
        tournamentId: tournament.id,
        operationType: DataProviderExecutionOperationType.TEAMS_CREATE,
      });
      // ------ FETCH TEAMS ------
      const fetchedTeams = await this.fetchTeams(tournament);
      // ------ MAP TEAMS ------
      const mappedTeams = await this.mapTeams(fetchedTeams, tournament.mode);
      // --- ENHANCE TEAMS BY ADDING LOGO URL ------
      await this.enhanceTeams(mappedTeams);
      // ------ CREATE TEAMS ------
      const createdTeams = await this.createOnDatabase(mappedTeams);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: tournament.label,
        summary: {
          tournamentId: tournament.id,
          tournamentLabel: tournament.label,
          provider: tournament.provider,
          mappedTeams: mappedTeams,
          teamsCount: createdTeams.length,
          ...reportSummaryResult,
        },
      });

      return fetchedTeams;
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
          source: 'TEAMS_DATA_PROVIDER_INIT_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
        await this.execution?.failure({
          reportFileKey: reportUploadResult.s3Key,
          reportFileUrl: reportUploadResult.s3Url,
          tournamentLabel: tournament.label,
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
          source: 'TEAMS_DATA_PROVIDER_INIT_notification_failed',
        });
      }

      throw error;
    }
  }

  public async update(payload: CreateTeamsInput) {
    // ------ INPUT VALIDATION ------
    this.validateTournament(payload);
    // ------ FETCH TOURNAMENT ------
    const tournament = await SERVICES_TOURNAMENT.getTournament(payload.tournamentId);
    if (!tournament) throw new Error(`[TeamsDataProviderService] - [ERROR] - [UPDATE] - [TOURNAMENT NOT FOUND]`);

    try {
      // Create execution tracking
      this.execution = new DataProviderExecution({
        requestId: this.requestId,
        tournamentId: tournament.id,
        operationType: DataProviderExecutionOperationType.TEAMS_UPDATE,
      });
      // ------ FETCH TEAMS ------
      const fetchedTeams = await this.fetchTeams(tournament);
      // ------ MAP TEAMS ------
      const mappedTeams = await this.mapTeams(fetchedTeams, tournament.mode);
      // --- ENHANCE TEAMS BY ADDING LOGO URL ------
      await this.enhanceTeams(mappedTeams);
      // ------ UPDATE TEAMS ------
      const updatedTeams = await this.updateOnDatabase(mappedTeams);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: tournament.label,
        summary: {
          tournamentId: tournament.id,
          tournamentLabel: tournament.label,
          provider: tournament.provider,
          teamsCount: Array.isArray(updatedTeams) ? updatedTeams.length : 0,
          ...reportSummaryResult,
        },
      });

      return updatedTeams;
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
          source: 'TEAMS_DATA_PROVIDER_UPDATE_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
        await this.execution?.failure({
          reportFileKey: reportUploadResult.s3Key,
          reportFileUrl: reportUploadResult.s3Url,
          tournamentLabel: tournament.label,
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
          source: 'TEAMS_DATA_PROVIDER_UPDATE_notification_failed',
        });
      }

      throw error;
    }
  }

  private validateTournament(payload: CreateTeamsInput) {
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

  private getTeamLogoUrl(teamId: string) {
    return `https://img.sofascore.com/api/v1/team/${teamId}/image`;
  }

  private async uploadTeamLogo(teamId: string) {
    try {
      this.reporter.addOperation('scraping', 'tournament_logo', 'started');
      const logoUrl = this.getTeamLogoUrl(teamId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `team-${teamId}`,
      });
      const logo = this.scraper.getCloudFrontUrl(s3Key);

      this.reporter.addOperation('scraping', 'tournament_logo', 'completed', {
        logoUrl: logo,
        s3Key,
      });
      return logo;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('scraping', 'tournament_logo', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }
  private async enhanceTeams(teams: DB_InsertTeam[]) {
    console.log('enhanceTeams', teams);
    for (const team of teams) {
      const logo = await this.uploadTeamLogo(team.externalId);
      team.badge = logo;

      this.scraper.sleep(3000);
    }
    return teams;
  }

  private async fetchTeams(tournament: TournamentWithTypedMode) {
    if (tournament.mode === 'regular-season-and-knockout') {
      const teamsFromStandings = await this.fetchTeamsFromStandings(tournament.id);
      const teamsFromKnockout = await this.fetchTeamsFromKnockoutRounds(tournament.id);

      return { fromStandings: teamsFromStandings, fromKnockout: teamsFromKnockout };
    } else if (tournament.mode === 'regular-season-only') {
      return { fromStandings: await this.fetchTeamsFromStandings(tournament.id) };
    } else if (tournament.mode === 'knockout-only') {
      return { fromKnockout: await this.fetchTeamsFromKnockoutRounds(tournament.id) };
    }
    throw new Error(`Invalid tournament mode: ${tournament.standingsMode}`);
  }

  private async fetchTeamsFromStandings(tournamentId: string) {
    this.reporter.addOperation('scraping', 'fetch_teams_from_standings', 'started');

    try {
      // Get tournament details
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Fetch teams from standings
      const url = `${tournament.baseUrl}/standings/total`;
      await this.scraper.goto(url);
      const rawContent = await this.scraper.getPageContent();

      if (!rawContent?.standings || rawContent?.standings?.length === 0) {
        throw new Error('No teams data found in standings');
      }

      this.reporter.addOperation('scraping', 'fetch_teams_from_standings', 'completed', {
        groupsCount: rawContent.standings.length,
        teams: rawContent.standings.flatMap((group: unknown) => {
          const groupData = group as { rows: unknown[] };
          return groupData.rows.map((row: unknown) => {
            const rowData = row as { team: { id: unknown; name: unknown; shortName: unknown } };
            return rowData.team.name;
          });
        }),
      });

      return rawContent as API_SOFASCORE_STANDINGS;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('scraping', 'fetch_teams_from_standings', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  private async fetchTeamsFromKnockoutRounds(tournamentId: string) {
    this.reporter.addOperation('scraping', 'fetch_teams_from_knockout_rounds', 'started');

    try {
      const knockoutRounds = await SERVICES_TOURNAMENT.getKnockoutRounds(tournamentId);
      const knockoutData = [];

      if (!knockoutRounds || knockoutRounds.length === 0) {
        throw new Error('No knockout rounds found');
      }

      for (const round of knockoutRounds) {
        await this.scraper.goto(round.providerUrl);

        const rawContent: API_SOFASCORE_ROUND = await this.scraper.getPageContent();
        knockoutData.push(rawContent);
      }

      this.reporter.addOperation('scraping', 'fetch_teams_from_knockout_rounds', 'completed', {
        knockoutRoundsCount: knockoutData.length,
        teams: knockoutData
          .flatMap((round: unknown) => {
            const roundData = round as { events?: unknown[] };
            if (roundData && roundData.events && Array.isArray(roundData.events)) {
              return roundData.events.map((event: unknown) => {
                const eventData = event as {
                  homeTeam: { name: unknown; shortName: unknown };
                  awayTeam: { name: unknown; shortName: unknown };
                };
                return [eventData.homeTeam.name, eventData.awayTeam.name];
              });
            }
            return [];
          })
          .flat(),
      });

      return knockoutData;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('scraping', 'fetch_teams_from_knockout_rounds', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  private async mapTeamsFromKnockoutRounds(knockoutRounds?: API_SOFASCORE_ROUND[]) {
    this.reporter.addOperation('transformation', 'map_teams_from_knockout', 'started');

    if (!knockoutRounds || knockoutRounds.length === 0) {
      this.reporter.addOperation('transformation', 'map_teams_from_knockout', 'failed', {
        error: 'No knockout rounds data provided',
      });
      return [];
    }

    const teamMap = new Map<string, DB_InsertTeam>();

    for (const round of knockoutRounds) {
      for (const event of round.events) {
        const eventData = event as {
          homeTeam: { id: unknown; name: unknown; shortName: unknown; slug?: string; nameCode?: string };
          awayTeam: { id: unknown; name: unknown; shortName: unknown; slug?: string; nameCode?: string };
        };

        // Process home team
        const homeTeamId = safeString(eventData.homeTeam.id);
        if (homeTeamId && !teamMap.has(homeTeamId)) {
          teamMap.set(homeTeamId, {
            externalId: homeTeamId,
            name: safeString(eventData.homeTeam.name) || '',
            shortName: safeString(eventData.homeTeam.shortName) || '',
            provider: 'sofascore',
            badge: '',
          });
        }

        // Process away team
        const awayTeamId = safeString(eventData.awayTeam.id);
        if (awayTeamId && !teamMap.has(awayTeamId)) {
          teamMap.set(awayTeamId, {
            externalId: awayTeamId,
            name: safeString(eventData.awayTeam.name) || '',
            shortName: safeString(eventData.awayTeam.shortName) || '',
            provider: 'sofascore',
            badge: '',
          });
        }
      }
    }

    const teams = Array.from(teamMap.values());

    if (teams.length === 0) {
      this.reporter.addOperation('transformation', 'map_teams_from_knockout', 'failed', {
        error: 'No teams data found in knockout rounds',
      });
      return [];
    }

    this.reporter.addOperation('transformation', 'map_teams_from_knockout', 'completed', {
      teamsCount: teams.length,
    });

    return teams;
  }

  private async mapTeamsFromStandings(standings: API_SOFASCORE_STANDINGS) {
    this.reporter.addOperation('transformation', 'map_teams_from_standings', 'started');

    const teams = standings.standings.flatMap((group: unknown) => {
      const groupData = group as { rows: unknown[] };
      return groupData.rows.map((row: unknown) => {
        const rowData = row as {
          team: {
            id: unknown;
            name: unknown;
            shortName: unknown;
            slug?: string;
            nameCode?: string;
          };
        };
        return {
          externalId: safeString(rowData.team.id) || '',
          name: safeString(rowData.team.name) || '',
          shortName: safeString(rowData.team.shortName) || '',
          slug: rowData.team.slug || '',
          nameCode: rowData.team.nameCode || '',
          provider: 'sofascore',
          badge: '',
        };
      });
    });

    if (teams.length === 0) {
      this.reporter.addOperation('transformation', 'map_teams_from_standings', 'failed', {
        error: 'No teams data found',
      });
      throw new Error('No teams data found');
    }

    this.reporter.addOperation('transformation', 'map_teams_from_standings', 'completed', {
      teamsCount: teams.length,
    });

    return teams;
  }

  private async mapTeams(
    fetchedTeams: { fromStandings?: API_SOFASCORE_STANDINGS; fromKnockout?: API_SOFASCORE_ROUND[] },
    tournamentMode: TournamentMode
  ) {
    this.reporter.addOperation('transformation', 'map_teams', 'started');

    if (tournamentMode === 'regular-season-and-knockout') {
      const teamsFromStandings = await this.mapTeamsFromStandings(
        fetchedTeams.fromStandings as API_SOFASCORE_STANDINGS
      );
      const teamsFromKnockout = await this.mapTeamsFromKnockoutRounds(fetchedTeams.fromKnockout);
      this.reporter.addOperation('transformation', 'map_teams', 'completed', {
        teamsFromStandingsCount: teamsFromStandings.length,
        teamsFromKnockoutCount: teamsFromKnockout.length,
      });
      return [...teamsFromStandings, ...teamsFromKnockout];
    } else if (tournamentMode === 'regular-season-only') {
      const teamsFromStandings = await this.mapTeamsFromStandings(
        fetchedTeams.fromStandings as API_SOFASCORE_STANDINGS
      );
      this.reporter.addOperation('transformation', 'map_teams', 'completed', {
        teamsFromStandingsCount: teamsFromStandings.length,
      });
      return teamsFromStandings;
    } else if (tournamentMode === 'knockout-only') {
      console.log('fetchedTeams', fetchedTeams);
      const teamsFromKnockout = await this.mapTeamsFromKnockoutRounds(fetchedTeams.fromKnockout);
      this.reporter.addOperation('transformation', 'map_teams', 'completed', {
        teamsFromKnockoutCount: teamsFromKnockout.length,
      });
      return teamsFromKnockout;
    }

    throw new Error(`Invalid tournament mode: ${tournamentMode}`);
  }

  public async createOnDatabase(teams: DB_InsertTeam[]) {
    this.reporter.addOperation('database', 'create_teams', 'started', {
      teamsCount: teams.length,
    });

    try {
      const query = await QUERIES_TEAMS.createTeams(teams);

      this.reporter.addOperation('database', 'create_teams', 'completed', {
        createdTeamsCount: query.length,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'create_teams', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'TeamsDataProviderService.createOnDatabase',
      });
      throw error;
    }
  }

  public async updateOnDatabase(teams: DB_InsertTeam[]): Promise<DB_InsertTeam[]> {
    this.reporter.addOperation('database', 'update_teams', 'started', {
      teamsCount: teams.length,
    });

    if (teams.length === 0) {
      this.reporter.addOperation('database', 'update_teams', 'failed', {
        error: 'No teams to update',
      });
      const error = new Error('No teams to update in the database');
      Profiling.error({
        error,
        source: 'TeamsDataProviderService.updateOnDatabase',
      });
      throw error;
    }

    try {
      const query = await QUERIES_TEAMS.updateTeams(teams);

      this.reporter.addOperation('database', 'update_teams', 'completed', {
        updatedTeamsCount: Array.isArray(query) ? query.length : 0,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'update_teams', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'TeamsDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }
}
