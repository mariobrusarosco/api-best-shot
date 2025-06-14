import { BaseScraper } from '../providers/playwright/base-scraper';
// import { ENDPOINT_ROUNDS, ENDPOINT_STANDINGS } from "../providers/sofascore_v2/schemas/endpoints";
// import { IRound } from "../providers/sofascore_v2/schemas/rounds";
// import { StandingsService } from "./standings";
// import { TournamentService } from "./tournaments";
// import { RoundService } from "./rounds";
// import { MatchesService } from "./matches";
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { TeamsDataProviderService } from './teams';
import { RoundDataProviderService } from './rounds';
import { TournamentDataProviderService } from './tournaments';
import { MatchesDataProviderService } from './match';
import { StandingsDataProviderService } from './standings';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
export class SofaScoreScraper extends BaseScraper {
  public async createTournament(payload: CreateTournamentInput) {
    try {
      const scraper = await BaseScraper.createInstance();
      console.log('TOURNAMENT CREATION - [START]', payload);

      const tournamentService = new TournamentDataProviderService(scraper);
      const standingsService = new StandingsDataProviderService(scraper);
      const roundService = new RoundDataProviderService(scraper);
      const teamsService = new TeamsDataProviderService(scraper);
      const matchesService = new MatchesDataProviderService(scraper);

      //Step 1: Tournament Service
      const tournament = await tournamentService.init(payload);
      //Step 2: Round Service
      const rounds = await roundService.init(tournament.id, tournament.baseUrl);
      //Step 3: Standings Service
      const standings = await standingsService.init(tournament.baseUrl, tournament.id);
      //Step 4: Teams Service
      const tournamentTemp = await SERVICES_TOURNAMENT.getTournament(tournament.id);
      const teams = await teamsService.init(tournamentTemp);
      //Step 5: Matches Service
      const matches = await matchesService.init(rounds, tournament as any);

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
