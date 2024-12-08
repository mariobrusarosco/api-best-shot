import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { DB_SelectLeaguePerformance, T_LeaguePerformance } from '../schema';

const getLeaguePerformance = async (
  leagueId: string
): Promise<DB_SelectLeaguePerformance> => {
  try {
    const [query] = await db
      .select()
      .from(T_LeaguePerformance)
      .where(eq(T_LeaguePerformance.leagueId, leagueId));
    return query;
  } catch (error: any) {
    throw error;
  }
};

const updateLeaguePerformance = async (leagueId: string) => {
  try {
    console.log({ leagueId });

    const leagueMembers = await db.query.T_LeagueRole.findMany({
      where: (T_LeagueRole, { eq }) => eq(T_LeagueRole.leagueId, leagueId),
      // where: (T_LeagueRole, { eq }) => (eq(T_LeagueRole.leagueId), leagueId),
    });
    const prepated = db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));

    // const insertValues: DB_InsertLeaguePerformance = [{
    //   leagueId: ,
    //   memberId,
    //   points: 4
    //  }]
    return leagueMembers;
  } catch (error: any) {
    throw error;
  }
};

export const PerformanceController = {
  getLeaguePerformance,
  updateLeaguePerformance,
};
