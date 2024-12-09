import { ApiProvider } from '@/domains/data-provider-v2';
import { MatchesRequest } from '@/domains/data-provider-v2/interface';
import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { DB_SelectTournament } from '@/domains/tournament/schema';
import { getTournamentById } from '@/domains/tournament/utils';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { Response } from 'express';

const Api = ApiProvider?.matches;

const setupMatches = async (req: MatchesRequest, res: Response) => {
  try {
    const [tournament] = await getTournamentById(req.body.tournamentId);
    const result = await createMatchesForEachRound(tournament);

    return res.status(200).send(result);
  } catch (error: any) {
    console.error('[ERROR] - setupMatches', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatches = async (req: MatchesRequest, res: Response) => {
  try {
    console.log('REQ', req.body);
    const [tournament] = await getTournamentById(req.body.tournamentId);

    const result = await updateMatchesForEachRound(tournament);
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
