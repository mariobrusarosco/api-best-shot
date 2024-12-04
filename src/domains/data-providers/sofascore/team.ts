import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import { TeamOnStandings } from '@/domains/tournament/typing';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { IApiProvider } from '../typing';
import { API_SofascoreStandingTeam } from './typing';

export const teamProvider: IApiProvider['team'] = {
  parseToStandings: (data: API_SofascoreStandingTeam) =>
    ({
      externalId: String(data?.team.id),
      matches: data.matches,
      position: data.position,
      wins: data.wins,
      points: data.points,
    } satisfies TeamOnStandings),
  parseToDB: (data: API_SofascoreStandingTeam) => {
    return {
      name: data.team.name,
      externalId: String(data.team.id),
      shortName: data.team.nameCode,
      badge: '',
      provider: 'sofa',
    } satisfies DB_InsertTeam;
  },
  insertOnDB: async teams => db.insert(T_Team).values(teams).returning(),
  updateOnDB: async teams => {
    return await db.transaction(async tx => {
      for (const team of teams) {
        return await tx
          .update(T_Team)
          .set(team)
          .where(eq(T_Team.externalId, team.externalId))
          .returning();
      }
    });
  },
};
