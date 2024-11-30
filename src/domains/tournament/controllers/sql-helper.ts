import { IMatch } from '@/domains/data-providers/globo-esporte';
import { isNullable } from '@/utils';
import { InsertTournament } from '../schema';

export const SQLHelper = {
  parseMatch: (match: IMatch) => {
    return {
      ...match,
      externalId: String(match.externalId),
      roundId: String(match.roundId),
      homeTeamId: String(match.home.id),
      awayTeamId: String(match.away.id),
      awayScore: isNullable(match.away.score) ? null : String(match.away.score),
      homeScore: isNullable(match.home.score) ? null : String(match.home.score),
    };
  },
  parseTeam: (team: IMatch['home'] | IMatch['away']) => {
    return {
      name: team.name,
      shortName: team.shortName,
      externalId: String(team.externalId),
    };
  },
  parseTournament: (tournament: InsertTournament) => {
    return {
      ...tournament,
      externalId: String(tournament.externalId),
    };
  },
};
