import { Utils } from '@/domains/auth/utils';
import { MatchQueries } from '@/domains/match/queries';
import { DB_PERFORMANCE } from '@/domains/performance/database';
import { SERVICES_Performance } from '@/domains/performance/services';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentQueries } from '@/domains/tournament/queries';
import { T_TournamentStandings } from '@/domains/tournament/schema';
import db from '@/services/database';
import { eq, sql } from 'drizzle-orm';
import { Request, Response } from 'express';

const getTournamentPerformanceForMemberOld = async (req: Request, res: Response) => {
  try {
    const tournamentId = req?.params.tournamentId;
    const memberId = Utils.getAuthenticatedUserId(req, res);

    const query = await DB_PERFORMANCE.queryPerformanceForTournament(
      memberId,
      tournamentId
    );

    return res.status(200).send(query);
  } catch (error: any) {
    console.error('[TOURNAMENT API] - [getTournamentPerformanceForMember] -', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getTournamentStandings = async (req: Request, res: Response) => {
  try {
    const tournamentId = req?.params.tournamentId;
    const tournament = await TournamentQueries.tournament(tournamentId);

    if (!tournament) {
      return res.status(404).send({ message: 'Tournament not found' });
    }

    const query = await db
      .select()
      .from(T_TournamentStandings)
      .where(eq(T_TournamentStandings.tournamentId, tournament.id!))
      .orderBy(sql`cast(${T_TournamentStandings.order} as integer)`);

    return res.status(200).send({
      teams: query,
      format: tournament.standings,
      lastUpdated: query[0]?.updatedAt,
    });
  } catch (error: any) {
    console.error('[TOURNAMENT API] -[getTournamentStandings] -', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getTournament = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const tournamentId = req?.params.tournamentId;
    const tournament = await TournamentQueries.tournament(tournamentId);
    const onbordingCompleted = await TournamentQueries.checkOnboardingStatus({
      memberId,
      tournamentId,
    });
    const nearestMatch = await MatchQueries.nearestMatchOnDatabase({
      tournamentId,
    });

    const starterRound = nearestMatch?.roundId ?? tournament?.rounds.at(-1)?.slug;

    res.status(200).send({ ...tournament, starterRound, onbordingCompleted, memberId });
    return;
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getAllTournaments = async (_: Request, res: Response) => {
  try {
    const tournaments = await TournamentQueries.allTournaments();

    return res.status(200).send(tournaments);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
};
const getTournamentPerformanceForMember = async (req: Request, res: Response) => {
  const tournamentId = req?.params.tournamentId;
  const memberId = Utils.getAuthenticatedUserId(req, res);

  const performance = await SERVICES_Performance.getMemberTournamentPerformanceV2(memberId, tournamentId);
  
  return res.status(200).send(performance);
};

export const API_TOURNAMENT = {
  getTournamentPerformanceForMemberOld,
  getTournamentStandings,
  getTournament,
  getAllTournaments,
  getTournamentPerformanceForMember,
};

