import { BaseScraper } from '../providers/playwright/base-scraper';
import { DB_InsertMatch, T_Match } from '@/domains/match/schema';
import { safeString } from '@/utils';
import db from '@/services/database';
import { ENDPOINT_ROUND } from '../providers/sofascore_v2/schemas/endpoints';
import Profiling from '@/services/profiling';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';

const safeSofaDate = (date: any) => {
  return date === null || date === undefined ? null : new Date(date);
};

export class MatchesDataProviderService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  public async getTournamentMatches(
    rounds: DB_SelectTournamentRound[],
    tournamentId: string
  ) {
    try {
      console.log('[MATCH SERVICE] - [GET TOURNAMENT MATCHES] - Rounds count:', rounds.length);
      
      if (rounds.length === 0) {
        console.log('[MATCH SERVICE] - [GET TOURNAMENT MATCHES] - No rounds provided, returning empty matches array');
        return [];
      }

      const roundsWithMatches: DB_InsertMatch[][] = [];

      for (const round of rounds) {
        Profiling.log({
          msg: `Providing matches for round: ${round.label} of tournament: ${tournamentId}`,
        });

        await this.scraper.goto(round.providerUrl);
        const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

        if (!rawContent?.events || rawContent?.events?.length === 0) {
          Profiling.log({
            msg: `[No matches returned from round: (${round.slug}) Skipping to next round]`,
          });
          await this.scraper.sleep(2500);
          continue;
        }

        const matches = this.mapMatches(rawContent, tournamentId, round.slug);
        roundsWithMatches.push(matches);

        await this.scraper.sleep(2500);
      }

      return roundsWithMatches.flat();
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT MATCHES]', error);
      throw error;
    }
  }

  public mapMatches(rawContent: ENDPOINT_ROUND, tournamentId: string, roundSlug: string) {
    try {
      const matches = rawContent.events.map(event => {
        return {
          externalId: safeString(event.id),
          provider: 'sofa',
          tournamentId,
          roundSlug,
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

  public getMatchStatus(match: ENDPOINT_ROUND['events'][number]) {
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
    console.log('[MATCH SERVICE] - [CREATE ON DATABASE] - Matches count:', matches.length);
    
    if (matches.length === 0) {
      Profiling.error({
        error: new Error('No matches to create in the database'),
        source: 'MatchesDataProviderService.createOnDatabase',  
      });
      return [];
    }
    const query = await db.insert(T_Match).values(matches);
    return query;
  }

  public async init(
    rounds: DB_SelectTournamentRound[],
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    const rawMatches = await this.getTournamentMatches(rounds, tournament.id);

    Profiling.log({
      msg: `[Setup of matches for tournament ${tournament.label}]`,
      data: { rawMatches },
    });

    const query = await this.createOnDatabase(rawMatches);

    return query;
  }
}
