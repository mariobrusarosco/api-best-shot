import { T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import { safeDate, safeString } from '@/utils';
import { eq } from 'drizzle-orm';
import { IApiProvider } from '../typing';
import { API_SofaScoreMatch } from './typing';

export const matchProvider: IApiProvider['match'] = {
  parseToDB: data => {
    const match = data.match as API_SofaScoreMatch;
    const tournamentId = data.tournamentId;
    const tournamentExternalId = String(data.tournamentExternalId);
    const roundId = String(data.roundId);

    return {
      externalId: String(match.id),
      provider: 'sofa',
      tournamentId,
      tournamentExternalId,
      roundId,
      homeTeamId: String(match.homeTeam.id),
      homeScore: safeString(match.homeScore.current),
      awayTeamId: String(match.awayTeam.id),
      awayScore: safeString(match.awayScore.current),
      date: safeDate(match.startTimestamp! * 1000),
      status: match.status.code === 100 ? 'ended' : 'open',
    };
  },
  insertOnDB: async matches => db.insert(T_Match).values(matches),
  updateOnDB: async matches => {
    return await db.transaction(async tx => {
      for (const match of matches) {
        await tx
          .update(T_Match)
          .set(match)
          .where(eq(T_Match.externalId, match.externalId));
      }
    });
  },
};
