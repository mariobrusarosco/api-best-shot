import { isNullable } from '@/utils';
import { DB_InsertTournament } from '../schema';
import { RawMatch, RawTeam } from '../typing/sql';

export const SQLHelper = {
  parseMatch: (match: RawMatch) => {
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
  parseTeam: (team: RawTeam) => {
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
