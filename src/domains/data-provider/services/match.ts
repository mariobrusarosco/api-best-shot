import type { ENDPOINT_MATCHES } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { DB_InsertMatch, T_Match } from '@/domains/match/schema';
import { safeString } from '@/utils';
import { DB_SelectTournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';

const safeSofaDate = (date: any) => {
  return date === null || date === undefined ? null : new Date(date);
};

export class MatchesService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  public async getTournamentMatches(
    rounds: DB_SelectTournamentRound[],
    tournamentId: string
  ) {
    try {
      const roundsWithMatches: DB_InsertMatch[][] = [];

      for (const round of rounds) {
        console.log(
          `[SOFASCORE] - [INFO] - [GET TOURNAMENT MATCHES] - [ROUND] ${round.label}`
        );

        await this.scraper.sleep(2500);

        await this.scraper.goto(round.providerUrl);
        const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_MATCHES;
        const matches = this.mapMatches(rawContent, tournamentId);

        console.log();

        roundsWithMatches.push(matches);
      }

      return roundsWithMatches.flat();
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT MATCHES]', error);
      throw error;
    }
  }

  public mapMatches(rawContent: ENDPOINT_MATCHES, tournamentId: string) {
    try {
      const matches = rawContent.events.map(event => {
        return {
          externalId: safeString(event.id),
          provider: 'sofa',
          tournamentId,
          roundSlug: safeString(event.roundInfo.round),
          homeTeamId: safeString(event.homeTeam.id),
          homeScore: safeString(event.homeScore.display, null),
          homePenaltiesScore: safeString(event.homeScore.penalties, null),
          awayTeamId: safeString(event.awayTeam.id),
          awayScore: safeString(event.awayScore.display, null),
          awayPenaltiesScore: safeString(event.awayScore.penalties, null),
          date: safeSofaDate(event.startTimestamp! * 1000),
          status: this.getMatchStatus(event),
        } as DB_InsertMatch;
      });

      return matches as DB_InsertMatch[];
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [MAP MATCHES]', error);
      throw error;
    }
  }

  public getMatchStatus(match: ENDPOINT_MATCHES['events'][number]) {
    try {
      const matchWasPostponed = match.status.type === 'postponed';
      const matcheEnded = match.status.type === 'finished';

      if (matchWasPostponed) return 'not-defined';
      if (matcheEnded) return 'ended';
      return 'open';
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET MATCH STATUS]', error);
      throw error;
    }
  }

  async createOnDatabase(matches: DB_InsertMatch[]) {
    const query = await db.insert(T_Match).values(matches);
    return query;
  }

  public async init(rounds: DB_SelectTournamentRound[], tournamentId: string) {
    const rawMatches = await this.getTournamentMatches(rounds, tournamentId);

    console.log('[LOG] - [DATA PROVIDER] - [START] - CREATING MATCHES ON DATABASE');
    const query = await this.createOnDatabase(rawMatches);

    return query;
  }
}
