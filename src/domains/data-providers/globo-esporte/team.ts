import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import { TeamOnStandings } from '@/domains/tournament/typing';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { IApiProvider } from '../typing';
import { API_GloboEsporteTeam } from './typing/api';

export const teamProvider: IApiProvider['team'] = {
  parseToStandings: (team: API_GloboEsporteTeam) =>
    ({
      externalId: String(team?.equipe_id),
      matches: team.vitorias,
      position: team.ordem,
      wins: team.vitorias,
      points: team.pontos,
    } satisfies TeamOnStandings),
  parseToDB: (team: API_GloboEsporteTeam) => {
    return {
      name: team.nome_popular,
      externalId: String(team.equipe_id),
      shortName: team.sigla,
      badge: team.escudo,
      provider: 'ge',
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
