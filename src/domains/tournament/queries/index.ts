import db from '@/services/database';
import { and, eq, sql } from 'drizzle-orm';
import { T_Tournament, T_TournamentRound } from '../schema';

const allTournaments = async () => {
  try {
    return db
      .select({
        id: T_Tournament.id,
        label: T_Tournament.label,
        logo: T_Tournament.logo,
      })
      .from(T_Tournament)
      .where(eq(T_Tournament.provider, 'sofa'));
  } catch (error: any) {
    console.error('[Query_Tournament] - [queryAllMemberTournaments]', error);
  }
};

const tournament = async (tournamenId: string) => {
  try {
    const [tournament] = await db
      .select({
        id: T_Tournament.id,
        label: T_Tournament.label,
        logo: T_Tournament.logo,
        baseUrl: T_Tournament.baseUrl,
        provider: T_Tournament.provider,
        mode: T_Tournament.mode,
        standings: T_Tournament.standings,
      })
      .from(T_Tournament)
      .where(and(eq(T_Tournament.provider, 'sofa'), eq(T_Tournament.id, tournamenId)));

    const rounds = await db
      .select({
        label: T_TournamentRound.label,
        slug: T_TournamentRound.slug,
      })
      .from(T_TournamentRound)
      .where(eq(T_TournamentRound.tournamentId, tournamenId))
      .orderBy(sql`cast(${T_TournamentRound.order} as integer)`);

    return { ...tournament, rounds };
  } catch (error: any) {
    console.error('[Query_Tournament] - [queryTournament]', error);
  }
};

const allTournamentRounds = async (tournamenId: string) => {
  try {
    return db
      .select()
      .from(T_TournamentRound)
      .where(eq(T_TournamentRound.tournamentId, tournamenId));
  } catch (error: any) {
    console.error('[TournamentQueries] - [allAvailableRounds]', error);
  }
};

const knockoutRounds = async (tournamenId: string) => {
  try {
    return db
      .select()
      .from(T_TournamentRound)
      .where(
        and(
          eq(T_TournamentRound.tournamentId, tournamenId),
          eq(T_TournamentRound.type, 'knockout')
        )
      );
  } catch (error: any) {
    console.error('[TournamentQueries] - [allKnockoutRounds]', error);
  }
};

import { T_TournamentPerformance } from '@/domains/performance/schema';
import Profiling from '@/services/profiling';

const checkOnboardingStatus = async ({
  memberId,
  tournamentId,
}: {
  memberId: string;
  tournamentId: string;
}) => {
  try {
    const [tournamentPerformance] = await db
      .select()
      .from(T_TournamentPerformance)
      .where(
        and(
          eq(T_TournamentPerformance.tournamentId, tournamentId),
          eq(T_TournamentPerformance.memberId, memberId)
        )
      );

    return !!tournamentPerformance;
  } catch (error: any) {
    Profiling.error('checkOnboardingStatus', error);
    return false;
  }
};

export const TournamentQueries = {
  allTournaments,
  tournament,
  allTournamentRounds,
  knockoutRounds,
  checkOnboardingStatus,
};

export type TournamentQuery = Awaited<ReturnType<typeof tournament>>;

export const QUERIES_Tournament = {
};