import type { ENDPOINT_MATCHES } from "@/domains/data-provider/providers/sofascore_v2/schemas/endpoints";
import { BaseScraper } from "../providers/playwright/base-scraper";
import { IRound } from "../providers/sofascore_v2/schemas/rounds";
import { DB_InsertMatch } from "@/domains/match/schema";
import { safeString } from "@/utils";


const safeSofaDate = (date: any) => {
    return date === null || date === undefined ? null : new Date(date);
  };

  
export class MatchesService {

    public async getTournamentMatches(rounds: IRound[], tournamentId: string, scraper: BaseScraper) {
        try {
            const roundsWithMatches = new Map<IRound['slug'], DB_InsertMatch[]>();
            
            for (const round of rounds) {
                console.log(`[SOFASCORE] - [INFO] - [GET TOURNAMENT MATCHES] - [ROUND] ${round.id}`);
                
                await scraper.sleep(2500);

                await scraper.goto(round.endpoint);
                const rawContent = await scraper.getPageContent() as ENDPOINT_MATCHES;
                const matches = this.mapMatches(rawContent, tournamentId);

                roundsWithMatches.set(round.slug, matches);
            }

            return roundsWithMatches;
        } catch (error) {
            console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT MATCHES]', error);
        }
    }

        public mapMatches(rawContent: ENDPOINT_MATCHES, tournamentId: string) {
        const matches = rawContent.events.map((event) => {
            return {
                externalId: safeString(event.id),
                provider: 'sofa',
                tournamentId,
                roundSlug: safeString(event.roundInfo.round),
                homeTeamId: safeString(event.homeTeam.id),
                homeScore: safeString(event.homeScore.display),
                homePenaltiesScore: safeString(event.homeScore.penalties),
                awayTeamId: safeString(event.awayTeam.id),
                awayScore: safeString(event.awayScore.display),
                awayPenaltiesScore: safeString(event.awayScore.penalties),
                date: safeSofaDate(event.startTimestamp! * 1000),
                status: this.getMatchStatus(event),
            }
        })

        return matches as DB_InsertMatch[];
    }

    public getMatchStatus(match: ENDPOINT_MATCHES['events'][number]) {
        const matchWasPostponed = match.status.type === 'postponed';
        const matcheEnded = match.status.type === 'finished';
      
        if (matchWasPostponed) return 'not-defined';
        if (matcheEnded) return 'ended';
        return 'open';
      };
      

}
