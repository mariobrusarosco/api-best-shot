import { DataProviderReport } from '@/domains/data-provider/services/report';
import { QUERIES_TEAMS } from '@/domains/team/queries';
import { DB_InsertTeam } from '@/domains/team/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { DataProviderExecutionOperationType } from '../typing';
import { DataProviderExecution } from './execution';

export interface CreateTeamsInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
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

  public async init(payload: CreateTeamsInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.TEAMS_CREATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH TEAMS ------
      const fetchedTeams = await this.fetchTeams(payload.tournamentId);
      // ------ MAP TEAMS ------
      const mappedTeams = await this.mapTeams(fetchedTeams);
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
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          teamsCount: createdTeams.length,
          ...reportSummaryResult,
        },
      });

      return createdTeams;
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

  public async update(payload: CreateTeamsInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.TEAMS_UPDATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH TEAMS ------
      const fetchedTeams = await this.fetchTeams(payload.tournamentId);
      // ------ MAP TEAMS ------
      const mappedTeams = await this.mapTeams(fetchedTeams);
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
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          teamsCount: Array.isArray(updatedTeams) ? updatedTeams.length : 0,
          ...reportSummaryResult,
        },
      });

      return updatedTeams;
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

  private async fetchTeams(tournamentId: string) {
    this.reporter.addOperation('scraping', 'fetch_teams', 'started');

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
        this.reporter.addOperation('scraping', 'fetch_teams', 'completed', {
          note: 'No teams data found in standings',
        });
        return [];
      }

      this.reporter.addOperation('scraping', 'fetch_teams', 'completed', {
        groupsCount: rawContent.standings.length,
      });

      return rawContent;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('scraping', 'fetch_teams', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  private async mapTeams(fetchedTeams: unknown) {
    this.reporter.addOperation('transformation', 'map_teams', 'started');

    const teamsData = fetchedTeams as { standings?: unknown[] };
    if (!fetchedTeams || !teamsData.standings) {
      this.reporter.addOperation('transformation', 'map_teams', 'completed', {
        teamsCount: 0,
        note: 'No teams to map',
      });
      return [];
    }

    const teams = teamsData.standings.flatMap((group: unknown) => {
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
          externalId: safeString(rowData.team.id),
          name: safeString(rowData.team.name),
          shortName: safeString(rowData.team.shortName),
          slug: rowData.team.slug || '',
          nameCode: rowData.team.nameCode || '',
          provider: 'sofascore',
          badge: '',
        };
      });
    });

    if (teams.length === 0) {
      this.reporter.addOperation('transformation', 'map_teams', 'failed', {
        error: 'No teams data found',
      });
      throw new Error('No teams data found');
    }

    this.reporter.addOperation('transformation', 'map_teams', 'completed', {
      teamsCount: teams.length,
    });

    return teams;
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
