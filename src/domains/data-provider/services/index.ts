import { BaseScraper } from "../providers/playwright/base-scraper";
// import { ENDPOINT_ROUNDS, ENDPOINT_STANDINGS } from "../providers/sofascore_v2/schemas/endpoints";
// import { IRound } from "../providers/sofascore_v2/schemas/rounds";
// import { StandingsService } from "./standings";
// import { TournamentService } from "./tournaments";
// import { RoundService } from "./rounds";
// import { MatchesService } from "./matches";
import { CreateTournamentInput, TournamentRequest } from "../api/v2/tournament/typing";
import { TeamsService } from "./teams";
import { RoundService } from "./rounds";
import { StandingsService } from "./standings";
import { TournamentService } from "./tournaments";
// import { TeamsService } from "./teams";
export class SofaScoreScraper extends BaseScraper {
    constructor() {
        super();
    }   


    
    public async createTournament(payload: CreateTournamentInput) {
        try {
            const scraper = new BaseScraper();
            await scraper.init();
            console.log('TOURNAMENT CREATION - [START]', payload);

        const tournamentService = new TournamentService()
        const standingsService = new StandingsService(scraper)
        const roundService = new RoundService(scraper)
        const teamsService = new TeamsService(scraper)
        // const matchesService = new MatchesService()
        
        //Step 1: Tournament Service
        const tournament = await tournamentService.init(payload);
        //Step 2: Round Service
        const rounds = await roundService.init(tournament.id, tournament.baseUrl);

        //Step 3: Standings Service
        const standings = await standingsService.init(tournament.baseUrl, tournament.id);

        //Step 4: Teams Service
        const teams = await teamsService.init(tournament.baseUrl);


        //Step 4: Get Tournament Matches
        // const matches = await matchesService.getTournamentMatches(rounds, payload.tournamentPublicId, scraper);




        return {
            tournament,
            rounds,
            standings,
            teams
        }
        } catch (error) {
            console.error('TOURNAMENT CREATION - [ERROR]', error);
            throw error;
        }
    }

} 
