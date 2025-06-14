import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import {
  DB_InsertTournamentStandings,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import { safeString } from '@/utils';
import db from '@/services/database';
import Profiling from '@/services/profiling';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

export class StandingsDataProviderService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  public async mapTournamentStandings(
    standingsResponse: ENDPOINT_STANDINGS,
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    try {
      const standings = standingsResponse.standings.map(group => {
        const groupsStandings = group.rows.map(row => ({
          teamExternalId: safeString(row.team.id),
          tournamentId: tournament.id,
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

        Profiling.log({
          msg: `[Mapped standings for groups: ${group.name}]`,
          data: { groupsStandings },
        });

        return {
          groupId: group.id,
          groupName: group.name,
          standings: groupsStandings,
        };
      });

      const results = standings.flatMap(
        group => group.standings
      ) as DB_InsertTournamentStandings[];

      return results;
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_mapTournamentStandings',
        error,
      });
      throw error;
    }
  }

  public async getStandings(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    try {
      const url = `${tournament.baseUrl}/standings/total`;
      await this.scraper.goto(url);
      const rawContent = await this.scraper.getPageContent();

      if (!rawContent?.standings || rawContent?.standings?.length === 0) {
        Profiling.log({
          msg: `[No data returned from standings for tournament: ${tournament.label}]`,
        });
        return null;
      }

      return rawContent;
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_getStandings',
        error,
      });
      throw error;
    }
  }

  public async createOnDatabase(standings: DB_InsertTournamentStandings[]) {
    const query = await db.insert(T_TournamentStandings).values(standings);
    return query;
  }

  public async init(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    try {
      const rawStandings = await this.getStandings(tournament);
      const standings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.createOnDatabase(standings);

      Profiling.log({
        msg: `[Setup of standings for tournament ${tournament.label}]`,
        data: { standings },
      });

      return query;
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_init',
        error,
      });
      throw error;
    }
  }
}
