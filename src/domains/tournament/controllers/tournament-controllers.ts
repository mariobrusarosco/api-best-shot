import { aliasedTable, and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';

import { ProviderGloboEsporte } from '@/domains/data-providers/typing/data-providers/globo-esporte/api-mapper';
import { TMatch } from '@/domains/match/schema';
import { TTeam } from '@/domains/team/schema';
import { InsertTournament, TTournament } from '@/domains/tournament/schema';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

const ApiProvider = ProviderGloboEsporte;

async function getTournament(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId;
  const roundId = req?.query.round || 1;
  const homeTeam = aliasedTable(TTeam, 'homeTeam');
  const awayTeam = aliasedTable(TTeam, 'awayTeam');

  try {
    const [tournament] = await db
      .select()
      .from(TTournament)
      .where(eq(TTournament.id, tournamentId));

    const matches = await db
      .select({
        id: TMatch.id,
        round: TMatch.roundId,
        tournamentId: TMatch.tournamentId,
        date: TMatch.date,
        status: TMatch.status,
        home: {
          id: TMatch.homeTeamId,
          score: TMatch.homeScore,
          shortName: homeTeam.shortName,
          badge: homeTeam.badge,
          name: homeTeam.name,
        },
        away: {
          id: TMatch.awayTeamId,
          score: TMatch.awayScore,
          shortName: awayTeam.shortName,
          badge: awayTeam.badge,
          name: awayTeam.name,
        },
      })
      .from(TMatch)
      .leftJoin(homeTeam, eq(TMatch.homeTeamId, homeTeam.externalId))
      .leftJoin(awayTeam, eq(TMatch.awayTeamId, awayTeam.externalId))
      .where(
        and(eq(TMatch.roundId, String(roundId)), eq(TMatch.tournamentId, tournamentId))
      );

    return res.status(200).send({
      ...tournament,
      matches,
    });
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
}

async function getAllTournaments(_: Request, res: Response) {
  try {
    const result = await db.select().from(TTournament);

    return res.status(200).send(result);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as InsertTournament & { provider: string };

    if (!body.label) {
      res.status(400).json({ message: 'You must provide a label for a tournament' });

      return;
    }

    const temp = null;

    // const [tournament] = await ApiProvider.createTournamentOnDatabase(body);

    // if (!tournament) return res.status(400).send('No tournament created');

    // let ROUND = 1;

    // while (ROUND <= Number(body.rounds)) {
    //   const url = ApiProvider.getURL({
    //     externalId: body.externalId,
    //     slug: body.slug,
    //     mode: body.mode,
    //     round: ROUND,
    //   });

    //   const responseApiRound = await axios.get(url);
    //   const matches = ApiProvider.mapData({
    //     tournamentId: tournament.id,
    //     roundId: ROUND,
    //     rawData: responseApiRound.data,
    //   });

    //   matches.forEach(async match => {
    //     await Provider.createMatchOnDatabase(match);
    //     await Provider.upsertTeamOnDatabase(match.teams.home);
    //     await Provider.upsertTeamOnDatabase(match.teams.away);
    //   });

    //   ROUND++;
    // }

    return res.json(temp);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function updateTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as InsertTournament & { provider: string };

    // let ROUND = 1;

    // while (ROUND <= Number(body.rounds)) {
    //   const url = ApiProvider.getURL({
    //     externalId: body.externalId,
    //     slug: body.slug,
    //     mode: body.mode,
    //     round: ROUND,
    //   });

    //   const responseApiRound = await axios.get(url);
    //   const matches = ApiProvider.mapData({
    //     tournamentId: body.externalId,
    //     roundId: ROUND,
    //     rawData: responseApiRound.data,
    //   });

    //   matches.forEach(async match => {
    //     await ApiProvider.updateMatchOnDatabase(match);
    //     await ApiProvider.upsertTeamOnDatabase(match.teams.home);
    //     await ApiProvider.upsertTeamOnDatabase(match.teams.away);
    //   });

    //   ROUND++;
    // }
    return res.json('OK');
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
