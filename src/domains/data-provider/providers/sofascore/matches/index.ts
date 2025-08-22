import { API_SOFASCORE_ROUND } from '@/domains/data-provider/providers/sofascore/tournament-rounds/typing';
import { IApiProvider } from '@/domains/data-provider/typing';
import { DB_InsertMatch, T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import { safeString } from '@/utils';

const safeSofaDate = (date: unknown): Date | null => {
  return date === null || date === undefined ? null : new Date(date as string | number | Date);
};

export const SofascoreMatches: IApiProvider['matches'] = {
  createOnDatabase: async matches => {
    const query = await db.insert(T_Match).values(matches).returning();

    return query;
  },
  upsertOnDatabase: async matches => {
    console.log('[LOG] - [START] - UPSERTING MATCHES ON DATABASE');

    await db.transaction(async tx => {
      for (const match of matches) {
        await tx
          .insert(T_Match)
          .values(match)
          .onConflictDoUpdate({
            target: [T_Match.externalId, T_Match.provider],
            set: {
              ...match,
            },
          });
      }
    });
    console.log('[LOG] - [SUCCESS] - UPSERTING MATCHES ON DATABASE');
  },
  mapRoundMatches: ({ round, roundSlug, tournamentId }) => {
    return round.events.map(match => {
      return {
        externalId: String(match.id),
        provider: 'sofa',
        tournamentId,
        roundSlug,
        homeTeamId: String(match.homeTeam.id),
        homeScore: safeString(match.homeScore.display),
        homePenaltiesScore: safeString(match.homeScore.penalties),
        awayTeamId: String(match.awayTeam.id),
        awayScore: safeString(match.awayScore.display),
        awayPenaltiesScore: safeString(match.awayScore.penalties),
        date: safeSofaDate(match.startTimestamp! * 1000),
        status: getMatchStatus(match),
      } as DB_InsertMatch;
    });
  },
};

const getMatchStatus = (match: API_SOFASCORE_ROUND['events'][number]) => {
  const matchWasPostponed = match.status.type === 'postponed';
  const matcheEnded = match.status.type === 'finished';

  if (matchWasPostponed) return 'not-defined';
  if (matcheEnded) return 'ended';
  return 'open';
};
