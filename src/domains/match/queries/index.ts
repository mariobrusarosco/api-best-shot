import db from '@/services/database';
import { T_Match, T_Tournament } from '@/services/database/schema';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
dayjs.extend(utc);
dayjs.extend(isToday);

const currentDayMatchesOnDatabase = async (filter?: { tournamentId?: string }) => {
  const startOfDay = dayjs().utc().startOf('day').toDate().toISOString();
  const endOfDay = dayjs().utc().endOf('day').toDate().toISOString();

  let whereClause = sql`date >= ${startOfDay} AND date <= ${endOfDay}`;

  if (filter?.tournamentId) {
    whereClause = sql`${whereClause} AND ${T_Match.tournamentId} = ${filter.tournamentId}`;
  }

  return db
    .selectDistinct({
      tournamentId: T_Match.tournamentId,
      tournamentLabel: T_Tournament.label,
      standingsUrl: T_Tournament.standingsUrl,
      roundsUrl: T_Tournament.roundsUrl,
      match: T_Match.id,
      date: T_Match.date,
      roundId: T_Match.roundId,
    })
    .from(T_Match)
    .leftJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
    .where(whereClause)
    .orderBy(asc(T_Match.date));
};

const nearestMatchOnDatabase = async (filter: { tournamentId: string }) => {
  const now = dayjs().utc().toDate();

  const [match] = await db
    .select({
      tournamentId: T_Match.tournamentId,
      match: T_Match.id,
      date: T_Match.date,
      roundId: T_Match.roundId,
    })
    .from(T_Match)
    .leftJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
    .where(
      and(
        eq(T_Match.tournamentId, filter.tournamentId),
        eq(T_Match.status, 'open'),
        gte(T_Match.date, now)
      )
    )
    .limit(1);

  return match;
};

export const MatchQueries = {
  currentDayMatchesOnDatabase,
  nearestMatchOnDatabase,
};
