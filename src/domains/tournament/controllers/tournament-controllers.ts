import { and, eq, isNull } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';

import { ACTIVE_PROVIDER, ApiProvider } from '@/domains/data-providers';
import {} from '@/domains/data-providers/typing';
import { TMatch } from '@/domains/match/schema';
import { ErrorMapper } from '@/domains/tournament/error-handling/mapper';
import { InsertTournament, TTournament } from '@/domains/tournament/schema';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

async function getTournament(req: Request, res: Response) {
  try {
    const tournamentId = req?.params.tournamentId;
    const [tournament] = await db
      .select()
      .from(TTournament)
      .where(
        and(eq(TTournament.id, tournamentId), eq(TTournament.provider, ACTIVE_PROVIDER))
      );

    return res.status(200).send(tournament);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
}

async function getAllTournaments(_: Request, res: Response) {
  try {
    const result = await db
      .select()
      .from(TTournament)
      .where(eq(TTournament.provider, ACTIVE_PROVIDER));

    return res.status(200).send(result);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as InsertTournament & { provider: string };

    if (!body.label) {
      res
        .status(ErrorMapper.MISSING_LABEL.status)
        .json({ message: ErrorMapper.MISSING_LABEL.user });

      return;
    }

    const [tournament] = await ApiProvider.tournament.createOnDB(body);

    if (!tournament)
      return res
        .status(ErrorMapper.NO_TOURNAMENT_CREATED.status)
        .json({ message: ErrorMapper.NO_TOURNAMENT_CREATED.user });

    let ROUND = 1;
    while (ROUND <= Number(tournament.rounds)) {
      const url = ApiProvider.rounds.prepareUrl({
        externalId: body.externalId,
        slug: body.slug,
        mode: body.mode,
        round: ROUND,
        season: body.season,
      });

      const roundOfMatchesFromApi = await ApiProvider.rounds.fetchRound(url);

      const matches = roundOfMatchesFromApi.map(rawMatch =>
        ApiProvider.match.parse({
          match: rawMatch,
          roundId: ROUND,
          tournamentId: tournament.id,
          tournamentExternalId: body.externalId,
        })
      );

      const createdMatches = await ApiProvider.match.insertMatchesOnDB(matches);

      console.log('CREATED MATCHES: ', { createdMatches });
      ROUND++;
    }

    return res.json(tournament);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function updateTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as InsertTournament & { provider: string };
    const updateQuery = await ApiProvider.tournament.updateOnDB(body);
    const updatedTournament = updateQuery[0];

    if (!updatedTournament) {
      return res
        .status(ErrorMapper.NO_TOURNAMENT_UPDATED.status)
        .json({ message: ErrorMapper.NO_TOURNAMENT_UPDATED.user });
    }

    // SELECTS ROUNDS WITH NO SCORE TO AVOID OVERCALLING THE API
    const selectQuery = await db
      .selectDistinct({ roundId: TMatch.roundId })
      .from(TMatch)
      .where(
        and(
          eq(TMatch.tournamentId, updatedTournament.id),
          isNull(TMatch.homeScore),
          isNull(TMatch.awayScore)
        )
      );
    const scorelessMatches = new Set(selectQuery.map(round => Number(round.roundId)));

    // STARTS CALLING THE API
    let ROUND = 1;
    while (ROUND <= Number(updatedTournament.rounds)) {
      if (scorelessMatches.has(ROUND)) {
        const url = ApiProvider.rounds.prepareUrl({
          externalId: body.externalId,
          slug: body.slug,
          mode: body.mode,
          round: ROUND,
          season: body.season,
        });

        console.log('FETCHING URL:', url);
        const roundOfMatchesFromApi = await ApiProvider.rounds.fetchRound(url);
        const matches = roundOfMatchesFromApi.map(rawMatch =>
          ApiProvider.match.parse({
            match: rawMatch,
            roundId: ROUND,
            tournamentId: updatedTournament.id,
            tournamentExternalId: updatedTournament.externalId,
          })
        );

        await ApiProvider.match.updateMatchesOnDB(matches);
      }
      ROUND++;
    }

    return res.json(updatedTournament);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

const TournamentController = {
  getTournament,
  getAllTournaments,
  updateTournamentFromExternalSource,
  createTournamentFromExternalSource,
};

export default TournamentController;

// // CREATING TOURNAMENT TEAMS
// const url = ApiProvider.tournament.prepareUrl({
//   externalId: body.externalId,
// });
// const apiResponse = await ApiProvider.tournament.fetchStandings(url);
// const standings = ApiProvider.tournament.parseStandings(apiResponse);

// console.log('-----------', standings);
