import { TMatch } from '@/domains/match/schema';
import db from '@/services/database';
import { safeDate, safeString } from '@/utils';
import { eq } from 'drizzle-orm';
import { IApiProvider } from '../typing';
import { SofaScoreMatchApi } from './typing';

export const matchProvider: IApiProvider['match'] = {
  parse: data => {
    const match = data.match as SofaScoreMatchApi;
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
      status: match.status.code !== 0 ? 'started' : 'not-started',
    };
  },
  insertMatchesOnDB: async matches => db.insert(TMatch).values(matches),
  updateMatchesOnDB: async matches => {
    return await db.transaction(async tx => {
      for (const match of matches) {
        await tx.update(TMatch).set(match).where(eq(TMatch.externalId, match.externalId));
      }
    });
  },
};
