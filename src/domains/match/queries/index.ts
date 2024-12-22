import db from '@/services/database';
import { T_Match, T_Tournament } from '@/services/database/schema';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { asc, eq, sql } from 'drizzle-orm';
dayjs.extend(utc);
dayjs.extend(isToday);

export const queryCurrentDayMatchesOnDatabase = async (filter?: {
  tournamentId?: string;
}) => {
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
