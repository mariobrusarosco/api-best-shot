import { AppStandingsTeam } from '../typing';
import { SofaScorestandings } from './typing';

type Team = SofaScorestandings['standings'][number]['rows'][number];

export const teamProvider = {
  parseFromStandings: (team: Team) =>
    ({
      externalId: String(team?.id),
      matches: team.matches,
      position: team.position,
      wins: team.wins,
      points: team.points,
    } satisfies AppStandingsTeam),
};
