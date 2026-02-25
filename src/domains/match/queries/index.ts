import db from '@/core/database';
import { T_Match, T_Team, T_Tournament } from '@/core/database/schema';
import { defineTimebox } from '@/utils/timebox';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { aliasedTable, and, asc, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import type { DB_InsertMatch, DB_SelectMatch } from '../schema';

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
    .where(and(eq(T_Match.tournamentId, filter.tournamentId), eq(T_Match.status, 'open'), gte(T_Match.date, now)))
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
    .where(and(eq(T_Match.tournamentId, filter.tournamentId), eq(T_Match.status, 'open'), gte(T_Match.date, now)))
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
      .leftJoin(homeTeam, eq(T_Match.homeTeamId, homeTeam.id))
      .leftJoin(awayTeam, eq(T_Match.awayTeamId, awayTeam.id))
      .where(and(eq(T_Match.tournamentId, tournamentId), eq(T_Match.roundSlug, roundId)));
  } catch (error: unknown) {
    console.error('[MATCH QUERIES] - [getMatchesByTournament]', error);
    throw error;
  }
};

const getMatchById = async (matchId: string) => {
  const [match] = await db.select().from(T_Match).where(eq(T_Match.id, matchId)).limit(1);
  return match || null;
};

const listDueOpenMatchesForPolling = async (params: {
  now: Date;
  lookbackStart: Date;
  staleBefore: Date;
  limit: number;
}) => {
  return db
    .select({
      id: T_Match.id,
      externalId: T_Match.externalId,
      provider: T_Match.provider,
      status: T_Match.status,
      date: T_Match.date,
      lastCheckedAt: T_Match.lastCheckedAt,
      tournamentId: T_Match.tournamentId,
    })
    .from(T_Match)
    .where(
      and(
        eq(T_Match.status, 'open'),
        eq(T_Match.provider, 'sofascore'),
        gte(T_Match.date, params.lookbackStart),
        lte(T_Match.date, params.now),
        or(isNull(T_Match.lastCheckedAt), lte(T_Match.lastCheckedAt, params.staleBefore))
      )
    )
    .orderBy(desc(T_Match.date), asc(T_Match.lastCheckedAt))
    .limit(params.limit);
};

const updateMatchFromPolling = async (params: {
  matchId: string;
  status: DB_SelectMatch['status'];
  homeScore: number | null;
  awayScore: number | null;
  homePenaltiesScore: number | null;
  awayPenaltiesScore: number | null;
  checkedAt: Date;
}) => {
  const [updatedMatch] = await db
    .update(T_Match)
    .set({
      status: params.status,
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      homePenaltiesScore: params.homePenaltiesScore,
      awayPenaltiesScore: params.awayPenaltiesScore,
      lastCheckedAt: params.checkedAt,
      updatedAt: params.checkedAt,
    })
    .where(eq(T_Match.id, params.matchId))
    .returning();

  return updatedMatch || null;
};

const touchMatchCheckedAt = async (matchId: string, checkedAt: Date) => {
  const [updatedMatch] = await db
    .update(T_Match)
    .set({
      lastCheckedAt: checkedAt,
      updatedAt: checkedAt,
    })
    .where(eq(T_Match.id, matchId))
    .returning();

  return updatedMatch || null;
};

const createMatches = async (matches: DB_InsertMatch[]) => {
  if (matches.length === 0) {
    return [];
  }

  try {
    const result = await db.insert(T_Match).values(matches).returning();
    return result;
  } catch (error: unknown) {
    console.error('[MATCH QUERIES] - [createMatches]', error);
    throw error;
  }
};

const upsertMatches = async (matches: DB_InsertMatch[]) => {
  if (matches.length === 0) {
    return [];
  }

  try {
    const result = await db.transaction(async (tx: unknown) => {
      const transaction = tx as typeof db;
      const results = [];
      for (const match of matches) {
        const result = await transaction
          .insert(T_Match)
          .values(match)
          .onConflictDoUpdate({
            target: [T_Match.externalId, T_Match.provider],
            set: {
              ...match,
            },
          })
          .returning();
        results.push(result[0]);
      }
      return results;
    });

    return result;
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
  getMatchById,
  listDueOpenMatchesForPolling,
  updateMatchFromPolling,
  touchMatchCheckedAt,
  createMatches,
  upsertMatches,
};
