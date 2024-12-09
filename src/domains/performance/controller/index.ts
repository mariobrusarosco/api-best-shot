import { Utils } from '@/domains/auth/utils';
import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { T_Guess } from '@/domains/guess/schema';
import { T_LeagueRole } from '@/domains/league/schema';
import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { type Request, Response } from 'express';
import {
  DB_InsertTournamentPerformance,
  T_LeaguePerformance,
  T_TournamentPerformance,
} from '../schema';

const getLeaguePerformance = async (req: Request, res: Response) => {
  try {
    const { leagueId } = req?.params as { leagueId: string };

    const leagueMembers = await db
      .select()
      .from(T_LeagueRole)
      .where(eq(T_LeagueRole.leagueId, leagueId));

    const [query] = await db
      .select()
      .from(T_LeaguePerformance)
      .where(eq(T_LeaguePerformance.leagueId, leagueId));

    return res.status(200).send({ leagueMembers, query });
  } catch (error: any) {
    throw error;
  }
};

const updateLeaguePerformance = async (req: Request, res: Response) => {
  try {
    const { leagueId } = req?.params as { leagueId: string };

    const leagueMembersQuery = await db
      .select()
      .from(T_LeagueRole)
      .where(eq(T_LeagueRole.leagueId, leagueId));

    // console.log('[updated]', leagueMembersQuery);

    const promises = leagueMembersQuery.map(async member => {
      const memberId = member.memberId;

      return await updateAllTournamentsForMember(memberId);
    });
    const result = await Promise.all(promises);

    console.log('RESULT', result);
    return res.status(200).send({
      leagueMembersQuery,
      result,
    });
  } catch (error: any) {}
};

const updateAllTournamentsForMember = async (memberId: string) => {
  const tournamentPerformances = await db
    .select()
    .from(T_TournamentPerformance)
    .where(eq(T_TournamentPerformance.memberId, memberId));

  const promises = tournamentPerformances.map(async performance => {
    // QUery
    const parsedGuesses = await queryMemberTournamentGuesses(
      performance.memberId,
      performance.tournamentId
    );
    // Update
    const updated = await updatePerformanceOnDatabase(
      performance.memberId,
      performance.tournamentId,
      parsedGuesses
    );
    // console.log('updated --------- ', updated);
    return updated;
  });

  const updateResult = await Promise.all(promises);

  // console.log('RESULT --------- ', updateResult);
  return updateResult;
};

const updateTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { tournamentId } = req?.params as { tournamentId: string };

    // QUery
    const parsedGuesses = await queryMemberTournamentGuesses(memberId, tournamentId);
    // Update
    const updated = await updatePerformanceOnDatabase(
      memberId,
      tournamentId,
      parsedGuesses
    );
    return res.status(200).send(updated);
  } catch (error: any) {
    throw error;
  }
};

const getTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { tournamentId } = req?.params as { tournamentId: string };

    const guesses = await getMatchGuessesForTournament(tournamentId, memberId);
    const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));
    const [performance] = await db
      .select()
      .from(T_TournamentPerformance)
      .where(
        and(
          eq(T_TournamentPerformance.memberId, memberId),
          eq(T_TournamentPerformance.tournamentId, tournamentId)
        )
      );

    if (!performance) return res.status(204).send(null);

    return res.status(200).send({
      details: parsedGuesses,
      points: performance.points,
      lastUpdated: performance.updatedAt,
    });
  } catch (error: any) {
    console.error('[GET] - [GUESS]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

/// AUX
const getMatchGuessesForTournament = async (tournamentId: string, memberId: string) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));

  return guesses;
};

const queryMemberTournamentGuesses = async (memberId: string, tournamentId: string) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));

  console.log('queryMemberTournamentGuesses ->', memberId, tournamentId);
  return guesses.map(row => runGuessAnalysis(row.guess, row.match));
};

const updatePerformanceOnDatabase = async (
  memberId: string,
  tournamentId: string,
  parsedGuesses: Awaited<ReturnType<typeof queryMemberTournamentGuesses>>
) => {
  const insertValues: DB_InsertTournamentPerformance = {
    tournamentId,
    memberId,
    points: String(getTotalPoints(parsedGuesses)),
  };

  console.log('updatePerformanceOnDatabase -----------', memberId, tournamentId);

  return await db
    .update(T_TournamentPerformance)
    .set(insertValues)
    .where(
      and(
        eq(T_TournamentPerformance.tournamentId, tournamentId),
        eq(T_TournamentPerformance.memberId, memberId)
      )
    )
    .returning();
};

const getTotalPoints = (guesses?: ReturnType<typeof runGuessAnalysis>[]) => {
  if (!performance) return null;

  return guesses?.reduce((acc, value) => acc + value.total, 0);
};
/// AUX

export const PerformanceController = {
  getLeaguePerformance,
  updateTournamentPerformance,
  getTournamentPerformance,
  updateLeaguePerformance,
};

// const prepated = db
//   .select()
//   .from(T_Guess)
//   .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
//   .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));
