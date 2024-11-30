import { AppStandingsTeam } from '../typing';
import { GloboEsporteStandings } from './typing';

type Team = GloboEsporteStandings['classificacao'][number];

export const teamProvider = {
  parseFromStandings: (team: Team) =>
    ({
      externalId: String(team?.equipe_id),
      matches: team.vitorias,
      position: team.ordem,
      wins: team.vitorias,
      points: team.pontos,
    } satisfies AppStandingsTeam),
};
