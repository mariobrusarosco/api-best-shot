import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import { ErrorMapper } from '../error-handling/mapper'

import Tournament, { ITournament } from '../schema'
import Match from '../../match/schema'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'

async function getTournamentMatches(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId

  try {
    await Tournament.findOne(
      { _id: tournamentId },
      {
        __v: 0
      }
    )

    const allRelatedMatches = await Match.find({ tournamentId })

    return res.status(200).send(allRelatedMatches)
  } catch (error: any) {
    if (error?.kind === 'ObjectId') {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.user)
    } else {
      console.error(error)
      return res
        .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
        .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
    }
  }
}

async function getAllTournaments(req: Request, res: Response) {
  try {
    const allTournaments = await Tournament.find(
      {},
      {
        __v: 0
      }
    )
    return res.status(200).send(allTournaments)
  } catch (error: any) {
    if (error?.kind === 'ObjectId') {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.user)
    } else {
      console.error(error)
      return res
        .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
        .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
    }
  }
}

async function getTournament(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId

  try {
    const tournament = await Tournament.findOne(
      { _id: tournamentId },
      {
        __v: 0
      }
    )

    return res.status(200).send(tournament)
  } catch (error: any) {
    if (error?.kind === 'ObjectId') {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
    } else {
      return handleInternalServerErrorResponse(res, error)
    }
  }
}

async function createTournament(req: Request, res: Response) {
  const body = req?.body as ITournament

  if (!body.label) {
    return res.status(400).json({ message: 'You must provide a label for a tournament' })
  }

  try {
    const result = await Tournament.create({
      ...body
    })

    return res.json(result)
  } catch (error) {
    // log here: ErrorMapper.DUPLICATED_LABEL.debug
    return res
      .status(ErrorMapper.DUPLICATED_LABEL.status)
      .send(ErrorMapper.DUPLICATED_LABEL)
  }
}

const TournamentController = {
  getTournament,
  getTournamentMatches,
  getAllTournaments,
  createTournament
}

export default TournamentController
