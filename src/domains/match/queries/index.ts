import db from '@/services/database';
import { T_Match, T_Tournament, T_Team } from '@/services/database/schema';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { and, asc, eq, gte, sql, aliasedTable } from 'drizzle-orm';
import { defineTimebox } from '@/utils/timebox';
import type { DB_InsertMatch } from '../schema';

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
      baseUrl: T_Tournament.baseUrl,
      match: T_Match.id,
      date: T_Match.date,
      roundSlug: T_Match.roundSlug,
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
      roundId: T_Match.roundSlug,
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
    .orderBy(asc(T_Match.date))
    .limit(1);

  return match;
};

const currentDayMatches = async (filter?: { tournamentId?: string }) => {
  const startOfDay = dayjs().startOf('day').toDate().toISOString();
  const endOfDay = dayjs().endOf('day').toDate().toISOString();

  let whereClause = sql`date >= ${startOfDay} AND date <= ${endOfDay}`;

  if (filter?.tournamentId) {
    whereClause = sql`${whereClause} AND ${T_Match.tournamentId} = ${filter.tournamentId}`;
  }

  return db
    .selectDistinct({
      tournamentId: T_Match.tournamentId,
      tournamentLabel: T_Tournament.label,
      baseUrl: T_Tournament.baseUrl,
      match: T_Match.id,
      date: T_Match.date,
      roundSlug: T_Match.roundSlug,
    })
    .from(T_Match)
    .leftJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
    .where(whereClause)
    .orderBy(asc(T_Match.date));
};

const nearestMatch = async (filter: { tournamentId: string }) => {
  const now = dayjs().utc().toDate();

  const [match] = await db
    .select({
      tournamentId: T_Match.tournamentId,
      match: T_Match.id,
      date: T_Match.date,
      roundId: T_Match.roundSlug,
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
    .orderBy(asc(T_Match.date))
    .limit(1);

  return match;
};

const getMatchesByTournament = async (tournamentId: string, roundId: string) => {
  try {
    const homeTeam = aliasedTable(T_Team, 'homeTeam');
    const awayTeam = aliasedTable(T_Team, 'awayTeam');

    return db
      .select({
        id: T_Match.id,
        date: T_Match.date,
        round: T_Match.roundSlug,
        tournamentId: T_Match.tournamentId,
        status: T_Match.status,
        home: {
          id: T_Match.homeTeamId,
          score: T_Match.homeScore,
          shortName: homeTeam.shortName,
          badge: homeTeam.badge,
          name: homeTeam.name,
          penaltiesScore: T_Match.homePenaltiesScore,
        },
        away: {
          id: T_Match.awayTeamId,
          score: T_Match.awayScore,
          shortName: awayTeam.shortName,
          badge: awayTeam.badge,
          name: awayTeam.name,
          penaltiesScore: T_Match.awayPenaltiesScore,
        },
        timebox: sql<string>`${T_Match.date}`.mapWith(defineTimebox),
      })
      .from(T_Match)
      .leftJoin(homeTeam, eq(T_Match.homeTeamId, homeTeam.externalId))
      .leftJoin(awayTeam, eq(T_Match.awayTeamId, awayTeam.externalId))
      .where(and(eq(T_Match.tournamentId, tournamentId), eq(T_Match.roundSlug, roundId)));
  } catch (error: unknown) {
    console.error('[MATCH QUERIES] - [getMatchesByTournament]', error);
    throw error;
  }
};

const upsertMatches = async (matches: DB_InsertMatch[]) => {
  if (matches.length === 0) {
    return [];
  }

  try {
    await db.transaction(async (tx) => {
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

    return matches;
  } catch (error: unknown) {
    console.error('[MATCH QUERIES] - [upsertMatches]', error);
    throw error;
  }
};

export const MatchQueries = {
  currentDayMatchesOnDatabase,
  nearestMatchOnDatabase,
};

export const QUERIES_MATCH = {
  currentDayMatches,
  nearestMatch,
  getMatchesByTournament,
  upsertMatches,
};
