import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { MatchesDataProviderService } from './match';
import { DataProviderReport } from './reporter';
import { RoundDataProviderService } from './rounds';
import { StandingsDataProviderService } from './standings';
import { TeamsDataProviderService } from './teams';
import { TournamentDataProviderService } from './tournaments';

// Re-export DataProviderExecutionService from its own file
export { DataProviderExecutionService } from './execution';

export class SofaScoreScraper extends BaseScraper {
  public async createTournament(payload: CreateTournamentInput) {
    try {
      const scraper = await BaseScraper.createInstance();
      const requestId = randomUUID();
      console.log('TOURNAMENT CREATION - [START]', payload);

      const report = new DataProviderReport('create_tournament', requestId);
      const tournamentService = new TournamentDataProviderService(scraper, report);
      const standingsService = new StandingsDataProviderService(scraper, report);
      const roundService = new RoundDataProviderService(scraper, report);
      const teamsService = new TeamsDataProviderService(scraper, report);
      const matchesService = new MatchesDataProviderService(scraper, report);

      //Step 1: Tournament Service
      const { id: tournamentId } = await tournamentService.createTournament(payload);
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      //Step 2: Round Service
      const rounds = await roundService.createRounds(tournament);
      //Step 3: Standings Service
      const standings = await standingsService.createStandings(tournament);
      //Step 4: Teams Service
      const tournamentTemp = await SERVICES_TOURNAMENT.getTournament(tournament.id);
      const teams = await teamsService.createTeams(tournamentTemp);
      //Step 5: Matches Service
      const matches = await matchesService.createMatches(rounds, tournament);

      return {
        tournament,
        rounds,
        standings,
        teams,
        matches,
      };
    } catch (error) {
      console.error('TOURNAMENT CREATION - [ERROR]', error);
      throw error;
    }
  }

  public async create(payload: CreateTournamentInput) {
    return this.createTournament(payload);
  }
}
