import { ACTIVE_PROVIDER, ApiProvider } from '@/domains/data-providers';
import {} from '@/domains/data-providers/typing';
import { T_Match } from '@/domains/match/schema';
import { ErrorMapper } from '@/domains/tournament/error-handling/mapper';
import {
  DB_InsertTournament,
  DB_SelectTournament,
  T_Tournament,
} from '@/domains/tournament/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

const TournamentController = {
  getTournament,
  getAllTournaments,
  updateTournamentFromExternalSource,
  createTournamentFromExternalSource,
};

async function createTournamentOnDatabase(req: Request, res: Response) {
  const body = req?.body as DB_InsertTournament;
  const Tournament = ApiProvider.tournament;

  if (!body.label) {
    res
      .status(ErrorMapper.MISSING_LABEL.status)
      .json({ message: ErrorMapper.MISSING_LABEL.user });

    return;
  }

  const [tournament] = await Tournament.insertOnDB(body);

  if (!tournament) {
    res
      .status(ErrorMapper.NO_TOURNAMENT_CREATED.status)
      .json({ message: ErrorMapper.NO_TOURNAMENT_CREATED.user });
    return;
  }

  return tournament;
}

async function updateTournamentOnDatabase(req: Request) {
  const Tournament = ApiProvider.tournament;
  const body = req?.body as DB_InsertTournament;

  const updateQuery = await Tournament.updateOnDB(body);
  const updatedTournament = updateQuery[0];

  return updatedTournament;
}

async function createTeamsOnDatabase(tournament: DB_InsertTournament) {
  const Tournament = ApiProvider.tournament;

  const standingsUrl = Tournament.createUrl({
    externalId: tournament.externalId,
    mode: tournament.mode,
    season: tournament.season,
  });

  const standings = await Tournament.standings.fetch(standingsUrl);
  const teams = Tournament.teams.parseToDB(standings);
  const query = await Tournament.teams.insertOnDB(teams);

  return query;
}

async function createOrUpdateMatchesOnDatabase(
  tournament: DB_SelectTournament,
  action: 'create' | 'update'
) {
  try {
    const Rounds = ApiProvider.rounds;
    const Match = ApiProvider.match;

    // SELECTS ROUNDS WITH NO SCORE TO AVOID OVERCALLING THE API
    let ROUND_COUNT = 1;
    const scorelessMatchesIds = await getScorelessMatches(tournament);

    while (ROUND_COUNT <= Number(tournament.rounds)) {
      const shouldFetchRound =
        scorelessMatchesIds.has(ROUND_COUNT) && action === 'update';

      if (shouldFetchRound) {
        console.log('[UPDATING ROUND]', ROUND_COUNT, ' - for: ', tournament.provider);
        const url = Rounds.createUrl({
          externalId: String(tournament.externalId),
          slug: tournament.slug,
          mode: tournament.mode,
          round: ROUND_COUNT,
          season: tournament.season,
        });

        const rounds = await Rounds.fetch(url);
        const matches = rounds.map(rawMatch =>
          Match.parseToDB({
            match: rawMatch,
            roundId: ROUND_COUNT,
            tournamentId: String(tournament.id),
            tournamentExternalId: tournament.externalId,
          })
        );

        if (action === 'update') {
          Match.updateOnDB(matches);
        } else Match.insertOnDB(matches);
      }

      ROUND_COUNT++;
    }
  } catch (error: any) {
    console.error('[CREATING TOURNAMENT MATCHES ON DATABASE]', error);
  }
}

async function getScorelessMatches(tournament: DB_SelectTournament) {
  const selectQuery = await db
    .selectDistinct({ roundId: T_Match.roundId })
    .from(T_Match)
    .where(
      and(
        eq(T_Match.tournamentExternalId, tournament.externalId),
        isNull(T_Match.homeScore),
        isNull(T_Match.awayScore)
      )
    );

  console.log({ selectQuery });
  return new Set(selectQuery.map(round => Number(round.roundId)));
}

// ----------------------------------------------------------------

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const newTournament = await createTournamentOnDatabase(req, res);
    if (!newTournament) return;

    const result = await createOrUpdateMatchesOnDatabase(newTournament, 'create');

    const teams = await createTeamsOnDatabase(newTournament);
    console.log('RESULT----', result);

    return res.json({ teams, result });
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function updateTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const updatedTournament = await updateTournamentOnDatabase(req);
    if (!updatedTournament) {
      res
        .status(ErrorMapper.NO_TOURNAMENT_UPDATED.status)
        .json({ message: ErrorMapper.NO_TOURNAMENT_UPDATED.user });
      return;
    }

    const result = await createOrUpdateMatchesOnDatabase(updatedTournament, 'update');

    console.log('RESULT----', result);
    return res.json(updatedTournament);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function getTournament(req: Request, res: Response) {
  try {
    const tournamentId = req?.params.tournamentId;
    const [tournament] = await db
      .select()
      .from(T_Tournament)
      .where(
        and(eq(T_Tournament.id, tournamentId), eq(T_Tournament.provider, ACTIVE_PROVIDER))
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
      .from(T_Tournament)
      .where(eq(T_Tournament.provider, ACTIVE_PROVIDER));

    return res.status(200).send(result);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

export default TournamentController;

// const parsed = ApiProvider.tournament.standings.parse(standings);
// console.log(parsed);
