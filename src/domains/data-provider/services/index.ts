import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { MatchesDataProviderService } from './match';
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

      const tournamentService = new TournamentDataProviderService(scraper, requestId);
      const standingsService = new StandingsDataProviderService(scraper, requestId);
      const roundService = new RoundDataProviderService(scraper, requestId);
      const teamsService = new TeamsDataProviderService(scraper, requestId);
      const matchesService = new MatchesDataProviderService(scraper, requestId);

      //Step 1: Tournament Service
      const { id: tournamentId } = await tournamentService.init(payload);
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      //Step 2: Round Service
      const rounds = await roundService.init(tournament.id, tournament.baseUrl);
      //Step 3: Standings Service
      const standings = await standingsService.init(tournament);
      //Step 4: Teams Service
      const tournamentTemp = await SERVICES_TOURNAMENT.getTournament(tournament.id);
      const teams = await teamsService.init(tournamentTemp);
      //Step 5: Matches Service
      const matches = await matchesService.init(rounds, tournament);

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
