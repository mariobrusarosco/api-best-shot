import { ApiProvider } from '@/domains/data-provider-v2';
import { MatchesRequest } from '@/domains/data-provider-v2/interface';
import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentQueries } from '@/domains/tournament/queries';
import { DB_SelectTournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { Response } from 'express';

const Api = ApiProvider?.matches;

const setupMatches = async (req: MatchesRequest, res: Response) => {
  try {
    const { tournamentId } = req.params as { tournamentId: string };
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const result = await createMatchesForEachRound(tournament);

    return res.status(200).send(result);
  } catch (error: any) {
    console.error('[ERROR] - setupMatches', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatches = async (req: MatchesRequest, res: Response) => {
  try {
    const { tournamentId, round } = req.params as { tournamentId: string; round: number };

    const tournament = await TournamentQueries.tournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const result = await updateMatchesOfRound(tournament, round || 1);

    return res.status(200).send(result);
  } catch (error: any) {
    console.error('[ERROR] - updateMatches', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const MatchesDataController = {
  setupMatches,
  updateMatches,
};

const updateMatchesForEachRound = async (tournament: DB_SelectTournament) => {
  // SELECTS ROUNDS WITH NO SCORE TO AVOID OVERCALLING THE API
  let ROUND_COUNT = 1;
  const scorelessMatchesIds = await getNonStartedMatches(tournament);

  while (ROUND_COUNT <= Number(tournament.rounds)) {
    const shouldFetchRound = scorelessMatchesIds.has(ROUND_COUNT);

    if (shouldFetchRound) {
      console.log(
        '[UPDATING ROUND]',
        ROUND_COUNT,
        ' - for: ',
        tournament?.provider,
        '--- tournament:',
        tournament.label
      );

      const round = await Api.fetchRound(tournament.roundsUrl, ROUND_COUNT);
      const matches = Api.mapRound(round, String(ROUND_COUNT), String(tournament.id));

      await db.transaction(async tx => {
        for (const match of matches) {
          await tx
            .update(T_Match)
            .set(match)
            .where(eq(T_Match.externalId, match.externalId));
        }
      });
    }

    ROUND_COUNT++;
  }
};

const updateMatchesOfRound = async (tournament: DB_SelectTournament, roundId: number) => {
  const round = await Api.fetchRound(tournament.roundsUrl, roundId);
  const matches = Api.mapRound(round, String(roundId), String(tournament.id));

  await db.transaction(async tx => {
    for (const match of matches) {
      await tx.update(T_Match).set(match).where(eq(T_Match.externalId, match.externalId));
    }
  });
};

const createMatchesForEachRound = async (tournament: DB_SelectTournament) => {
  let ROUND_COUNT = 1;

  while (ROUND_COUNT <= Number(tournament.rounds)) {
    console.log(
      '[CREATING ROUND]',
      ROUND_COUNT,
      ' - for: ',
      tournament?.provider,
      '--- tournament:',
      tournament.label
    );

    const round = await Api.fetchRound(tournament.roundsUrl, ROUND_COUNT);
    const matches = Api.mapRound(round, String(ROUND_COUNT), String(tournament.id));
    await db.insert(T_Match).values(matches);

    ROUND_COUNT++;
  }
};

const getNonStartedMatches = async (tournament: DB_SelectTournament) => {
  const selectQuery = await db
    .selectDistinct({ roundId: T_Match.roundId })
    .from(T_Match)
    .where(
      and(eq(T_Match.tournamentId, tournament.id as string), eq(T_Match.status, 'open'))
    );

  return new Set(selectQuery.map(round => Number(round.roundId)));
};
