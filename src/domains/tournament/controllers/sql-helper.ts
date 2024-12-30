import { isNullable } from '@/utils';
import { DB_InsertTournament } from '../schema';

export const SQLHelper = {
  parseMatch: (match: any) => {
    return {
      ...match,
      externalId: String(match.externalId),
      roundId: String(match?.roundSlug),
      homeTeamId: String(match.home.id),
      awayTeamId: String(match.away.id),
      awayScore: isNullable(match.away.score) ? null : String(match.away.score),
      homeScore: isNullable(match.home.score) ? null : String(match.home.score),
    };
  },
  parseTeam: (team: any) => {
    return {
      name: team.name,
      shortName: team.shortName,
      externalId: String(team.externalId),
    };
  },
  parseTournament: (tournament: DB_InsertTournament) => {
    return {
      ...tournament,
      externalId: String(tournament.externalId),
    };
  },
};
