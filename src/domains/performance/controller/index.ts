import { Utils } from '@/domains/auth/utils';
import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { T_Guess } from '@/domains/guess/schema';
import { T_LeagueRole, T_LeagueTournament } from '@/domains/league/schema';
import { T_Match } from '@/domains/match/schema';
import { T_Member } from '@/domains/member/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { type Request, Response } from 'express';
import { DB_Performance } from '../database';
import { T_LeaguePerformance, T_TournamentPerformance } from '../schema';

const getLeaguePerformance = async (req: Request, res: Response) => {
  try {
    const { leagueId } = req?.params as { leagueId: string };

    const leagueMembersSubquery = db
      .select({
        memberId: T_LeagueRole.memberId,
      })
      .from(T_LeagueRole)
      .where(eq(T_LeagueRole.leagueId, leagueId));

    const leagueTournamentsSubquery = db
      .select({
        tournamentId: T_LeagueTournament.tournamentId,
      })
      .from(T_LeagueTournament)
      .where(
        and(
          eq(T_LeagueTournament.leagueId, leagueId),
          eq(T_LeagueTournament.status, 'tracked')
        )
      );

    // Main query combining the subquery
    const query = await db
      .select({
        id: T_Tournament.label,
        logo: T_Tournament.logo,
        member: T_Member.nickName,
        points: T_TournamentPerformance.points,
      })
      .from(T_TournamentPerformance)
      .leftJoin(T_Tournament, eq(T_Tournament.id, T_TournamentPerformance.tournamentId))
      .leftJoin(T_Member, eq(T_Member.id, T_TournamentPerformance.memberId))
      .where(
        and(
          inArray(T_TournamentPerformance.memberId, leagueMembersSubquery),
          inArray(T_TournamentPerformance.tournamentId, leagueTournamentsSubquery)
        )
      )
      .orderBy(desc(sql`cast(${T_TournamentPerformance.points} as integer)`));

    const performances = query.reduce(
      (
        acc: Record<
          string,
          { id: string; logo: string; members: { member: string; points: string }[] }
        >,
        tournament: (typeof query)[number]
      ) => {
        const id = tournament.id || '';
        const logo = tournament.logo || '';
        const points = tournament.points || '';
        const member = tournament.member || '';

        if (id && !acc[id]) {
          acc[id] = {
            id,
            logo: logo,
            members: [],
          };
        }

        if (tournament.member && tournament.points) {
          acc[id].members.push({ member: member as string, points: points as string });
        }
        return acc;
      },
      {}
    );

    return res.status(200).send(Object.values(performances));
  } catch (error: unknown) {
    return handleInternalServerErrorResponse(res, error);
  }
};

const updateLeaguePerformance = async (req: Request, res: Response) => {
  try {
    const { leagueId } = req?.params as { leagueId: string };
    const leagueMembers = await db
      .select({
        memberId: T_LeagueRole.memberId,
        leagueId: T_LeagueRole.leagueId,
      })
      .from(T_LeagueRole)
      .where(eq(T_LeagueRole.leagueId, leagueId));

    const leagueTournaments = await db
      .select({ id: T_LeagueTournament.tournamentId })
      .from(T_LeagueTournament)
      .where(
        and(
          eq(T_LeagueTournament.leagueId, leagueId),
          eq(T_LeagueTournament.status, 'tracked')
        )
      );

    const promises = leagueMembers.map(
      async (leagueMember: (typeof leagueMembers)[number]) => {
        const updatedData = await updateTournamentsForMember(
          leagueMember.memberId,
          leagueTournaments
        );
        const totalPoints = updatedData.reduce(
          (points, performance) => (points += Number(performance?.points || 0)),
          0
        );
        return db
          .update(T_LeaguePerformance)
          .set({
            leagueId: leagueId,
            memberId: leagueMember.memberId,
            points: String(totalPoints),
          })
          .where(
            and(
              eq(T_LeaguePerformance.memberId, leagueMember.memberId),
              eq(T_LeaguePerformance.leagueId, leagueMember.leagueId)
            )
          );
      }
    );

    const result = await Promise.all(promises);
    console.log('promises -', promises, 'result', result);
    return res.status(200).send('SUCCESS');
  } catch (error: unknown) {
    console.error('[ERROR] - updateLeaguePerformance', error);
  }
};

const getTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { tournamentId } = req.params;

    const guesses = await getMatchGuessesForTournament(tournamentId, memberId);
    const parsedGuesses = guesses.map((row: (typeof guesses)[number]) =>
      runGuessAnalysis(row.guess, row.match)
    );

    const performance = await db
      .select()
      .from(T_TournamentPerformance)
      .where(
        and(
          eq(T_TournamentPerformance.memberId, memberId),
          eq(T_TournamentPerformance.tournamentId, tournamentId)
        )
      );

    return res.status(200).send({
      details: parsedGuesses,
      points: performance?.[0]?.points ?? '0',
      lastUpdated: performance?.[0]?.updatedAt ?? null,
    });
  } catch (error: unknown) {
    console.error('[ERROR] - getTournamentPerformance', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const updateTournamentPerformance = async (req: Request, res: Response) => {
  const memberId = Utils.getAuthenticatedUserId(req, res);
  const { tournamentId } = req?.params as { tournamentId: string };

  const parsedGuesses = await queryMemberTournamentGuesses(memberId, tournamentId);
  const updated = await DB_Performance.updateTournamentPerformanceOnDatabase(
    memberId,
    tournamentId,
    parsedGuesses
  );
  return res.status(200).send(updated);
};

const getMatchGuessesForTournament = async (tournamentId: string, memberId: string) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)))
    .orderBy(T_Match.date);

  return guesses;
};

export const queryMemberTournamentGuesses = async (
  memberId: string,
  tournamentId: string
) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));

  return guesses.map((row: (typeof guesses)[number]) =>
    runGuessAnalysis(row.guess, row.match)
  );
};

export const updateLeagueTournamentsForMember = async (
  memberId: string,
  _leagueId: string // unused but kept for API consistency
) => {
  const tournamentPerformances = await db
    .select()
    .from(T_TournamentPerformance)
    .where(eq(T_TournamentPerformance.memberId, memberId));
  const promises = tournamentPerformances.map(
    async (performance: (typeof tournamentPerformances)[number]) => {
      const parsedGuesses = await queryMemberTournamentGuesses(
        performance.memberId,
        performance.tournamentId
      );
      const [updated] = await DB_Performance.updateTournamentPerformanceOnDatabase(
        performance.memberId,
        performance.tournamentId,
        parsedGuesses
      );
      return updated;
    }
  );

  const updateResult = await Promise.all(promises);

  return updateResult;
};

export const updateTournamentsForMember = async (
  memberId: string,
  tournaments: { id: string }[]
) => {
  const promises = tournaments.map(async (tournament: { id: string }) => {
    const parsedGuesses = await queryMemberTournamentGuesses(memberId, tournament.id);
    const [updated] = await DB_Performance.updateTournamentPerformanceOnDatabase(
      memberId,
      tournament.id,
      parsedGuesses
    );
    return updated;
  });

  const updateResult = await Promise.all(promises);

  return updateResult;
};

export const updateAllTournamentsForMember = async (memberId: string) => {
  const tournamentPerformances = await db
    .select()
    .from(T_TournamentPerformance)
    .where(eq(T_TournamentPerformance.memberId, memberId));

  const promises = tournamentPerformances.map(
    async (performance: (typeof tournamentPerformances)[number]) => {
      const parsedGuesses = await queryMemberTournamentGuesses(
        performance.memberId,
        performance.tournamentId
      );
      const [updated] = await DB_Performance.updateTournamentPerformanceOnDatabase(
        performance.memberId,
        performance.tournamentId,
        parsedGuesses
      );
      return updated;
    }
  );

  const updateResult = await Promise.all(promises);

  return updateResult;
};

export const updateAllLeaguesForMember = async (memberId: string) => {
  const leagues = await db
    .select()
    .from(T_LeagueRole)
    .where(eq(T_LeagueRole.memberId, memberId));

  const promises = leagues.map(async (leagueMember: (typeof leagues)[number]) => {
    const updatedData = await updateAllTournamentsForMember(leagueMember.memberId);

    const totalPoints = updatedData.reduce(
      (leaguePoitns, performance) => (leaguePoitns += Number(performance.points)),
      0
    );

    return db
      .update(T_LeaguePerformance)
      .set({
        leagueId: leagueMember.leagueId,
        memberId: leagueMember.memberId,
        points: String(totalPoints),
      })
      .where(
        and(
          eq(T_LeaguePerformance.memberId, leagueMember.memberId),
          eq(T_LeaguePerformance.leagueId, leagueMember.leagueId)
        )
      )
      .returning();
  });

  return Promise.all(promises);
};

export const PerformanceController = {
  getLeaguePerformance,
  updateTournamentPerformance,
  getTournamentPerformance,
  updateLeaguePerformance,
};
