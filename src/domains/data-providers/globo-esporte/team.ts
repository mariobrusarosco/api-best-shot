import { DB_InsertTeam } from '@/domains/team/schema';
import { TeamOnStandings } from '@/domains/tournament/typing';
import { API_GloboEsporteTeam } from './typing/api';

export const teamProvider = {
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
};
