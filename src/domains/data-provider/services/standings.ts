import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { TeamsService } from './teams';
import { DB_InsertTournamentStandings, T_TournamentStandings } from '@/domains/tournament/schema';
import { safeString } from '@/utils';
import db from '@/services/database';

export class StandingsService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  public async mapTournamentStandings(standingsResponse: ENDPOINT_STANDINGS, tournamentId: string) {
    try {
      const standings = standingsResponse.standings.map(group => {
        const groupsStandings = group.rows.map(row => ({
          teamExternalId: safeString(row.team.id),
          tournamentId: tournamentId,
          order: safeString(row.position),
          groupName: group.name,
          shortName: safeString(row.team.shortName),
          longName: safeString(row.team.name),
          points: safeString(row.points),
          games: safeString(row.matches),
          wins: safeString(row.wins),
          draws: safeString(row.draws),
          losses: safeString(row.losses),
          gf: safeString(row.scoresFor),
          ga: safeString(row.scoresAgainst),
          gd: row.scoreDiffFormatted,
          provider: 'sofascore',
        }));

        return {
          groupId: group.id,
          groupName: group.name,
          standings: groupsStandings,
        };
      });

      return standings.flatMap(group => group.standings) as DB_InsertTournamentStandings[];
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [MAP TOURNAMENT STANDINGS]', error);
      throw error;
    }
  }

  public async getStandings(baseUrl: string) {
    try {
      const url = `${baseUrl}/standings/total`;
      await this.scraper.goto(url);
      const rawContent = await this.scraper.getPageContent();

      return rawContent;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT STANDINGS]', error);
      throw error;
    }
  }

  public async createOnDatabase(standings: DB_InsertTournamentStandings[]) {
    const query = await db.insert(T_TournamentStandings).values(standings);
    return query;
  }

  public async init(baseUrl: string, tournamentId: string) {
    const rawStandings = await this.getStandings(baseUrl);
    const standings = await this.mapTournamentStandings(rawStandings, tournamentId);
    const query = await this.createOnDatabase(standings);

    return query;
  }
}
