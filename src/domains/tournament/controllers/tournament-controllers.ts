import { ACTIVE_PROVIDER, ApiProvider } from '@/domains/data-providers';
import {} from '@/domains/data-providers/typing';
import { T_Match } from '@/domains/match/schema';
import { ErrorMapper } from '@/domains/tournament/error-handling/mapper';
import { DB_InsertTournament, DB_Tournament } from '@/domains/tournament/schema';
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

async function getTournament(req: Request, res: Response) {
  try {
    const tournamentId = req?.params.tournamentId;
    const [tournament] = await db
      .select()
      .from(DB_Tournament)
      .where(
        and(
          eq(DB_Tournament.id, tournamentId),
          eq(DB_Tournament.provider, ACTIVE_PROVIDER)
        )
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
      .from(DB_Tournament)
      .where(eq(DB_Tournament.provider, ACTIVE_PROVIDER));

    return res.status(200).send(result);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function createTournamentOnDatabase(req: Request, res: Response) {
  const body = req?.body as DB_InsertTournament;

  if (!body.label) {
    res
      .status(ErrorMapper.MISSING_LABEL.status)
      .json({ message: ErrorMapper.MISSING_LABEL.user });

    return;
  }

  const [tournament] = await ApiProvider.tournament.createOnDB(body);

  if (!tournament) {
    res
      .status(ErrorMapper.NO_TOURNAMENT_CREATED.status)
      .json({ message: ErrorMapper.NO_TOURNAMENT_CREATED.user });
    return;
  }

  return tournament;
}

async function createTournamentMatchesOnDatabase(tournament: DB_InsertTournament) {
  try {
    let ROUND = 1;

    while (ROUND <= Number(1)) {
      const url = ApiProvider.rounds.createUrl({
        externalId: String(tournament.externalId),
        slug: tournament.slug,
        mode: tournament.mode,
        round: ROUND,
        season: tournament.season,
      });

      const rounds = await ApiProvider.rounds.fetch(url);
      const matches = rounds.map(rawMatch =>
        ApiProvider.match.parseToDB({
          match: rawMatch,
          roundId: ROUND,
          tournamentId: String(tournament.id),
          tournamentExternalId: tournament.externalId,
        })
      );

      return ApiProvider.match.insertOnDB(matches);
    }
  } catch (error: any) {
    console.log('[CREATING TOURNAMENT MATCHES ON DATABASE]', error);
  }
}

async function createTournamentTeams(tournament: DB_InsertTournament) {
  const standingsUrl = ApiProvider.tournament.createUrl({
    externalId: tournament.externalId,
  });

  const standings = await ApiProvider.tournament.standings.fetch(standingsUrl);
  const { teams } = await ApiProvider.tournament.standings.parse(standings);
}

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const newTournament = await createTournamentOnDatabase(req, res);
    if (!newTournament) return;

    await createTournamentMatchesOnDatabase(newTournament);
    await createTournamentTeams(newTournament);

    return res.json(newTournament);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function updateTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as DB_InsertTournament & { provider: string };
    const updateQuery = await ApiProvider.tournament.updateOnDB(body);
    const updatedTournament = updateQuery[0];

    if (!updatedTournament) {
      return res
        .status(ErrorMapper.NO_TOURNAMENT_UPDATED.status)
        .json({ message: ErrorMapper.NO_TOURNAMENT_UPDATED.user });
    }

    // SELECTS ROUNDS WITH NO SCORE TO AVOID OVERCALLING THE API
    const selectQuery = await db
      .selectDistinct({ roundId: T_Match.roundId })
      .from(T_Match)
      .where(
        and(
          eq(T_Match.tournamentId, updatedTournament.id),
          isNull(T_Match.homeScore),
          isNull(T_Match.awayScore)
        )
      );
    const scorelessMatches = new Set(selectQuery.map(round => Number(round.roundId)));

    // STARTS CALLING THE API
    let ROUND = 1;
    while (ROUND <= Number(updatedTournament.rounds)) {
      if (scorelessMatches.has(ROUND)) {
        const url = ApiProvider.rounds.createUrl({
          externalId: body.externalId,
          slug: body.slug,
          mode: body.mode,
          round: ROUND,
          season: body.season,
        });

        console.log('FETCHING URL:', url);
        const roundOfMatchesFromApi = await ApiProvider.rounds.fetch(url);
        const matches = roundOfMatchesFromApi.map(rawMatch =>
          ApiProvider.match.parseToDB({
            match: rawMatch,
            roundId: ROUND,
            tournamentId: updatedTournament.id,
            tournamentExternalId: updatedTournament.externalId,
          })
        );

        await ApiProvider.match.updateOnDB(matches);
      }
      ROUND++;
    }

    return res.json(updatedTournament);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

export default TournamentController;
