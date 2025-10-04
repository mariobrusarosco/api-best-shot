import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { MatchesDataProviderService } from './match';
import { RoundsDataProviderService } from './rounds';
import { StandingsDataProviderService } from './standings';
import { TeamsDataProviderService } from './teams';
import { TournamentDataProvider } from './tournaments';

// Re-export DataProviderExecution from its own file
export { DataProviderExecution } from './execution';

export class SofaScoreScraper extends BaseScraper {
  public async createTournament(payload: CreateTournamentInput) {
    try {
      const scraper = await BaseScraper.createInstance();
      const requestId = randomUUID();
      console.log('TOURNAMENT CREATION - [START]', payload);

      const tournamentService = new TournamentDataProvider(scraper, requestId);
      const standingsService = new StandingsDataProviderService(scraper, requestId);
      const roundService = new RoundsDataProviderService(scraper, requestId);
      const teamsService = new TeamsDataProviderService(scraper, requestId);
      const matchesService = new MatchesDataProviderService(scraper, requestId);

      //Step 1: Tournament Service
      const { id: tournamentId } = await tournamentService.init(payload);
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      //Step 2: Round Service
      const rounds = await roundService.init({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });
      //Step 3: Standings Service
      const standings = await standingsService.init({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });
      //Step 4: Teams Service
      const teams = await teamsService.init({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });
      //Step 5: Matches Service
      const matches = await matchesService.init({
        tournamentId: tournament.id,
        rounds: rounds,
      });

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
