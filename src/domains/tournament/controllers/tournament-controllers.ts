import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import { ErrorMapper } from '../error-handling/mapper'
import { eq } from 'drizzle-orm'
import Match from '../../match/schema'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import {
  InsertTournament,
  TOURNAMENT_EXTERNAL_ID,
  TOURNAMENT_TABLE
} from '../../../services/database/schema'
import db from '../../../services/database'
import {
  mapBrazilianSerieARound,
  parseBuiltInTournament
} from './parse-builtin-tournament'
// import { db } from 'src/services/database/index'

// async function getTournamentMatches(req: Request, res: Response) {
//   const tournamentId = req?.params.tournamentId

//   try {
//     await Tournament.findOne(
//       { _id: tournamentId },
//       {
//         __v: 0
//       }
//     )

//     const allRelatedMatches = await Match.find({ tournamentId })

//     return res.status(200).send(allRelatedMatches)
//   } catch (error: any) {
//     if (error?.kind === 'ObjectId') {
//       return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.user)
//     } else {
//       console.error(error)
//       return res
//         .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
//         .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
//     }
//   }
// }

async function getTournament(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId

  try {
    const tournament = await db
      .select()
      .from(TOURNAMENT_TABLE)
      .innerJoin(
        TOURNAMENT_EXTERNAL_ID,
        eq(TOURNAMENT_TABLE.id, TOURNAMENT_EXTERNAL_ID.tournamentId)
      )
      .where(eq(TOURNAMENT_TABLE.id, tournamentId))

    return res.status(200).send(tournament)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function getBuiltInTournament(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId
  const roundId = (req?.query.round || 1) as number

  try {
    const tournament = parseBuiltInTournament(tournamentId)
    const round = mapBrazilianSerieARound(tournament[roundId - 1])

    return res.status(200).send(round)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function getAllTournaments(req: Request, res: Response) {
  try {
    const result = await db.select().from(TOURNAMENT_TABLE)

    return res.status(200).send(result)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function createTournament(req: Request, res: Response) {
  const body = req?.body as InsertTournament

  if (!body.label) {
    return res.status(400).json({ message: 'You must provide a label for a tournament' })
  }

  try {
    const result = await db
      .insert(TOURNAMENT_TABLE)
      .values({ description: body.description, label: body.label })

    return res.json(result)
  } catch (error: any) {
    if (error?.code === ErrorMapper.DUPLICATED_LABEL.postgresErrorCode) {
      return res
        .status(ErrorMapper.DUPLICATED_LABEL.status)
        .send(ErrorMapper.DUPLICATED_LABEL.user)
    } else {
      return handleInternalServerErrorResponse(res, error)
    }
  }
}

const TournamentController = {
  getTournament,
  // getTournamentMatches,
  getAllTournaments,
  createTournament,
  getBuiltInTournament
}

export default TournamentController
