import type {
  ENDPOINT_ROUND,
  ENDPOINT_STANDINGS,
  I_TEAM_FROM_ROUND,
} from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { Profiling } from '@/services/profiling';
import { DB_InsertTeam } from '@/domains/team/schema';
import { safeString, sleep } from '@/utils';
import { QUERIES_TEAMS } from '@/domains/team/queries';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TeamsScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: any;
  timestamp: string;
}

interface TeamsScrapingInvoice {
  requestId: string;
  tournament: {
    id: string;
    label: string;
  };
  startTime: string;
  endTime?: string;
  operations: TeamsScrapingOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    teamCounts: {
      fromStandings: number;
      fromKnockout: number;
      afterDeduplication: number;
      afterEnhancement: number;
      created: number;
    };
  };
}

export class TeamsDataProviderService {
  private scraper: BaseScraper;
  private invoice: TeamsScrapingInvoice;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.invoice = {
      requestId,
      tournament: {
        id: '',
        label: '',
      },
      startTime: new Date().toISOString(),
      operations: [],
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        teamCounts: {
          fromStandings: 0,
          fromKnockout: 0,
          afterDeduplication: 0,
          afterEnhancement: 0,
          created: 0,
        },
      },
    };
  }

  private addOperation(step: string, operation: string, status: 'started' | 'completed' | 'failed', data?: any) {
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
    const filename = `teams-scraping-${this.invoice.requestId}.json`;
    const filepath = join(process.cwd(), 'tournament-scraping-reports', filename);
    
    try {
      writeFileSync(filepath, JSON.stringify(this.invoice, null, 2));
      Profiling.log({
        msg: `[INVOICE] Teams scraping report generated successfully`,
        data: { filepath, requestId: this.invoice.requestId },
        source: 'DATA_PROVIDER_V2_TEAMS_generateInvoiceFile',
      });
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TEAMS_generateInvoiceFile',
        error: error as Error,
      });
      console.error('Failed to write teams invoice file:', error);
    }
  }

  private getTeamLogoUrl(teamId: string | number): string {
    return `https://api.sofascore.app/api/v1/team/${teamId}/image`;
  }

  private async enhanceTeamWithLogo(team: DB_InsertTeam) {
    this.addOperation('enhancement', 'enhance_team_logo', 'started', { 
      teamName: team.name, 
      teamId: team.externalId 
    });

    try {
      const logoUrl = this.getTeamLogoUrl(team.externalId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `team-${team.externalId}`,
      });

      const enhancedTeam = {
        name: team.name,
        externalId: safeString(team.externalId) as string,
        shortName: team.shortName,
        badge: this.scraper.getCloudFrontUrl(s3Key),
        provider: 'sofa',
      } satisfies DB_InsertTeam;

      this.addOperation('enhancement', 'enhance_team_logo', 'completed', { 
        teamName: team.name, 
        logoUrl: enhancedTeam.badge 
      });

      return enhancedTeam;
    } catch (error) {
      this.addOperation('enhancement', 'enhance_team_logo', 'failed', { 
        teamName: team.name, 
        error: (error as Error).message 
      });
      Profiling.error({
        source: 'TEAMS_SERVICE_enhanceTeamWithLogo',
        error: `Failed to enhance team ${team.name} with logo: ${error}`,
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
  ) {
    const url = `${tournament.baseUrl}/standings/total`;
    this.addOperation('scraping', 'fetch_teams_standings', 'started', { url });

    try {
      await this.scraper.goto(url);
      const fetchResult = (await this.scraper.getPageContent()) as ENDPOINT_STANDINGS;
      
      const teamsCount = fetchResult.standings.reduce((total, group) => total + group.rows.length, 0);
      this.addOperation('scraping', 'fetch_teams_standings', 'completed', { 
        url, 
        teamsCount,
        groupsCount: fetchResult.standings.length 
      });

      return fetchResult;
    } catch (error: unknown) {
      this.addOperation('scraping', 'fetch_teams_standings', 'failed', { error: (error as Error).message });
      Profiling.error({
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromStandings',
        error: error as Error,
      });
      throw error;
    }
  }

  public async fetchTeamsFromKnockoutRounds(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    this.addOperation('scraping', 'fetch_teams_knockout', 'started', { tournamentId: tournament.id });

    try {
      const rounds = await QUERIES_TOURNAMENT_ROUND.getKnockoutRounds(tournament.id);
      
      this.addOperation('database', 'get_knockout_rounds', 'completed', { 
        roundsCount: rounds.length,
        rounds: rounds.map((round: any) => round.slug || round.label)
      });

      const ALL_KNOCKOUT_TEAMS = [] as I_TEAM_FROM_ROUND[];
      const uniqueTeamIds = new Set<string>(); // Track unique team IDs for early deduplication
      let totalSkippedDuplicates = 0;
      
      for (const round of rounds) {
        this.addOperation('scraping', 'fetch_round_teams', 'started', { 
          roundSlug: round.slug, 
          providerUrl: round.providerUrl 
        });

        await this.scraper.goto(round.providerUrl);
        const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

        if (!rawContent?.events || rawContent?.events?.length === 0) {
          this.addOperation('scraping', 'fetch_round_teams', 'completed', { 
            roundSlug: round.slug, 
            teamsCount: 0,
            note: 'No events found'
          });
          await sleep(2000);
          continue;
        }

        const roundMatches = rawContent.events;
        const roundTeams = roundMatches.flatMap(match => [
          match.homeTeam,
          match.awayTeam,
        ]);

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
          matchesCount: roundMatches.length
        });

        ALL_KNOCKOUT_TEAMS.push(...newTeams);
        await sleep(2000);
      }

      this.addOperation('scraping', 'fetch_teams_knockout', 'completed', { 
        totalUniqueTeams: ALL_KNOCKOUT_TEAMS.length,
        totalSkippedDuplicates,
        roundsProcessed: rounds.length,
        note: 'Early deduplication applied during processing'
      });

      return ALL_KNOCKOUT_TEAMS;
    } catch (error: unknown) {
      this.addOperation('scraping', 'fetch_teams_knockout', 'failed', { error: (error as Error).message });
      Profiling.error({
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromKnockoutRounds',
        error: error as Error,
      });
      throw error;
    }
  }

  public async createOnDatabase(teams: DB_InsertTeam[]) {
    this.addOperation('database', 'create_teams', 'started', { teamsCount: teams.length });

    try {
      const createdTeams = await QUERIES_TEAMS.createTeams(teams);
      
      this.addOperation('database', 'create_teams', 'completed', { 
        createdTeamsCount: createdTeams.length,
        teamIds: createdTeams.map((t: any) => t.id)
      });

      return createdTeams;
    } catch (error) {
      this.addOperation('database', 'create_teams', 'failed', { error: (error as Error).message });
      throw error;
    }
  }

  public async upsertOnDatabase(teams: DB_InsertTeam[]) {
    this.addOperation('database', 'upsert_teams', 'started', { teamsCount: teams.length });

    try {
      await QUERIES_TEAMS.updateTeams(teams);
      
      this.addOperation('database', 'upsert_teams', 'completed', { 
        upsertedTeamsCount: teams.length
      });
    } catch (error) {
      this.addOperation('database', 'upsert_teams', 'failed', { error: (error as Error).message });
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

    this.addOperation('initialization', 'validate_input', 'started', { 
      tournamentId: tournament.id, 
      tournamentLabel: tournament.label,
      tournamentMode: tournament.mode
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', { 
        tournamentId: tournament.id,
        mode: tournament.mode
      });

      let mappedTeamsFromStandings: any[] = [];
      let mappedTeamsFromKnockoutRounds: any[] = [];

      // Fetch teams based on tournament mode
      if (tournament.mode === 'knockout-only') {
        this.addOperation('initialization', 'tournament_mode_decision', 'completed', { 
          mode: 'knockout-only',
          note: 'Skipping standings fetch - knockout-only tournament'
        });

        // Only fetch from knockout rounds for knockout-only tournaments
        const teamsFromKnockoutRounds = await this.fetchTeamsFromKnockoutRounds(tournament);
        mappedTeamsFromKnockoutRounds = this.mapTeamsFromRound(teamsFromKnockoutRounds);
        this.invoice.summary.teamCounts.fromStandings = 0;
        this.invoice.summary.teamCounts.fromKnockout = mappedTeamsFromKnockoutRounds.length;
      } else {
        this.addOperation('initialization', 'tournament_mode_decision', 'completed', { 
          mode: tournament.mode || 'regular-season-and-knockout',
          note: 'Fetching from both standings and knockout rounds'
        });

        // Fetch from both standings and knockout rounds for regular tournaments
        const teamsFromStandings = await this.fetchTeamsFromStandings(tournament);
        mappedTeamsFromStandings = this.mapTeamsFromStandings(teamsFromStandings);
        this.invoice.summary.teamCounts.fromStandings = mappedTeamsFromStandings.length;

        const teamsFromKnockoutRounds = await this.fetchTeamsFromKnockoutRounds(tournament);
        mappedTeamsFromKnockoutRounds = this.mapTeamsFromRound(teamsFromKnockoutRounds);
        this.invoice.summary.teamCounts.fromKnockout = mappedTeamsFromKnockoutRounds.length;
      }

      // Deduplicate teams (handles both scenarios)
      this.addOperation('transformation', 'deduplicate_teams', 'started', { 
        standingsTeams: mappedTeamsFromStandings.length,
        knockoutTeams: mappedTeamsFromKnockoutRounds.length
      });

      const allTeams = removeDuplicatesTeams(
        mappedTeamsFromStandings,
        mappedTeamsFromKnockoutRounds
      );
      this.invoice.summary.teamCounts.afterDeduplication = allTeams.length;

      this.addOperation('transformation', 'deduplicate_teams', 'completed', { 
        uniqueTeamsCount: allTeams.length,
        duplicatesRemoved: (mappedTeamsFromStandings.length + mappedTeamsFromKnockoutRounds.length) - allTeams.length
      });

      this.addOperation('enhancement', 'enhance_teams_batch', 'started', { 
        teamsToEnhance: allTeams.length 
      });

      const enhancedTeams: DB_InsertTeam[] = [];
      const enhancedTeamIds = new Set<string>(); // Track enhanced team IDs to prevent duplicates
      
      for (const team of allTeams) {
        // Skip if we've already enhanced this team ID
        if (enhancedTeamIds.has(team.externalId)) {
          this.addOperation('enhancement', 'skip_duplicate_team', 'completed', { 
            teamId: team.externalId,
            teamName: team.name,
            reason: 'Already enhanced this team ID'
          });
          continue;
        }

        try {
          const enhancedTeam = await this.enhanceTeamWithLogo(team);
          enhancedTeams.push(enhancedTeam);
          enhancedTeamIds.add(team.externalId);
          await sleep(1000);
        } catch (error) {
          Profiling.error({
            source: 'DATA_PROVIDER_TEAMS_enhanceTeamWithLogo',
            error: `Failed to enhance team ${team.name}: ${error}`,
          });
          // Continue with next team even if one fails
          continue;
        }
      }

      this.invoice.summary.teamCounts.afterEnhancement = enhancedTeams.length;
      this.addOperation('enhancement', 'enhance_teams_batch', 'completed', { 
        enhancedTeamsCount: enhancedTeams.length,
        failedEnhancements: allTeams.length - enhancedTeams.length,
        skippedDuplicates: allTeams.length - enhancedTeams.length - (allTeams.length - enhancedTeams.length)
      });

      // Use upsert for knockout-only tournaments (handles new rounds appearing later)
      // Use create for regular tournaments (first-time creation)
      let query;
      if (tournament.mode === 'knockout-only') {
        await this.upsertOnDatabase(enhancedTeams);
        this.invoice.summary.teamCounts.created = enhancedTeams.length;
        query = enhancedTeams; // Return teams for consistency
      } else {
        query = await this.createOnDatabase(enhancedTeams);
        this.invoice.summary.teamCounts.created = query.length;
      }

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return query;
    } catch (error) {
      this.addOperation('initialization', 'process_teams', 'failed', { error: (error as Error).message });
      this.generateInvoiceFile();
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TEAMS_init',
        error,
      });
      throw error;
    }
  }

}

const removeDuplicatesTeams = (
  teamFromStandings: DB_InsertTeam[],
  teamFromKnockoutRounds: DB_InsertTeam[]
) => {
  const uniqueTeamsMap = new Map<string, DB_InsertTeam>();
  
  // Add all teams, using externalId as the key for deduplication
  [...teamFromStandings, ...teamFromKnockoutRounds].forEach(team => {
    if (!uniqueTeamsMap.has(team.externalId)) {
      uniqueTeamsMap.set(team.externalId, team);
    }
  });
  
  return Array.from(uniqueTeamsMap.values());
};
