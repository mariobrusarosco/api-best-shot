import { ACTIVE_PROVIDER } from '@/domains/data-providers';
import { ErrorMapper } from '@/domains/match/error-handling/mapper';
import { TMatch } from '@/domains/match/schema';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

async function createMatch(req: Request, res: Response) {
  const body = req?.body;

  // const validTournament = await Tournament.findOne({ _id: body?.tournamentId })

  // if (!validTournament) {
  //   return res
  //     .status(400)
  //     .send('You must provide a valid tournament id to create a match')
  // }

  try {
    return res.json([]);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

// async function getMatch(req: Request, res: Response) {
//   const matchId = req?.params.matchId

//   try {
//     const match = await Match.findOne(
//       { _id: matchId },
//       {
//         __v: 0
//       }
//     )

//     return res.status(200).send(match)
//   } catch (error: any) {
//     if (error?.value === 'NULL') {
//       return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
//     } else {
//       // log here: ErrorMapper.INTERNAL_SERVER_ERROR.debug
//       res
//         .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
//         .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user)
//     }
//   }
// }

async function getMatchesByTournament(req: Request, res: Response) {
  try {
    const { round, tournamentId } = req?.params as {
      tournamentId: string;
      round: string;
    };

    console.log({ ACTIVE_PROVIDER, round, tournamentId });

    const matches = await db
      .select()
      .from(TMatch)
      .where(
        and(
          eq(TMatch.tournamentId, tournamentId),
          eq(TMatch.provider, ACTIVE_PROVIDER),
          eq(TMatch.roundId, round)
        )
      );

    if (!matches) {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status);
    }

    res.status(200).send(matches);
  } catch (error: any) {
    // log here: ErrorMapper.INTERNAL_SERVER_ERROR.debug
    console.error('[TOURNAMENT] - [GET MACTHES BY TOURNAMENT]', error);

    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
}

// async function getAllTeamMatches(req: Request, res: Response) {
//   const teamId = req?.query.team
//   console.log({ teamId })

//   if (!teamId) {
//     return res
//       .status(ErrorMapper.NO_PROVIDED_TEAM_ABREVIATION.status)
//       .send(ErrorMapper.NO_PROVIDED_TEAM_ABREVIATION.user)
//   }

//   try {
//     const match = await Match.findOne(
//       { $or: [{ host: teamId }, { visitor: teamId }] },
//       {
//         __v: 0
//       }
//     )

//     return res.status(200).send(match)
//   } catch (error: any) {
//     if (error?.value === 'NULL') {
//       return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
//     } else {
//       // log here: ErrorMapper.INTERNAL_SERVER_ERROR.debug
//       return res
//         .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
//         .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user)
//     }
//   }
// }

// async function updateMatch(req: Request, res: Response) {
//   const body = req?.body as IMatch
//   const matchId = req?.params?.matchId

//   console.log({ matchId })

//   try {
//     const result = await Match.findOneAndUpdate({ _id: matchId }, body, {
//       returnDocument: 'after'
//     })

//     if (result) {
//       return res.status(200).send(result)
//     } else {
//       return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.user)
//     }
//   } catch (error) {
//     console.error(error)

//     return res
//       .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
//       .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user)
//   }
// }

const MatchController = {
  // getMatch,
  createMatch,
  getMatchesByTournament,
  // updateMatch,
  // getAllTeamMatches,
  // getAllMatches
};

export default MatchController;
