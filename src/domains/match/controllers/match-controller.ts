import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import { ErrorMapper } from '../error-handling/mapper'

import Match, { IMatch } from '../schema'
import Tournament from '../../tournament/schema'

async function getMatch(req: Request, res: Response) {
  const matchId = req?.params.matchId

  try {
    const match = await Match.findOne(
      { _id: matchId },
      {
        __v: 0
      }
    )

    return res.status(200).send(match)
  } catch (error: any) {
    if (error?.value === 'NULL') {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
    } else {
      // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
      res
        .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
        .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
    }
  }
}

async function getAllMatches(req: Request, res: Response) {
  try {
    const matches = await Match.find(
      {},
      {
        __v: 0
      }
    )

    return res.status(200).send(matches)
  } catch (error: any) {
    if (error?.value === 'NULL') {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
    } else {
      // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
      return res
        .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
        .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
    }
  }
}

async function getAllTeamMatches(req: Request, res: Response) {
  const teamId = req?.query.team
  console.log({ teamId })

  if (!teamId) {
    return res
      .status(ErrorMapper.NO_PROVIDED_TEAM_ABREVIATION.status)
      .send(ErrorMapper.NO_PROVIDED_TEAM_ABREVIATION.user)
  }

  try {
    const match = await Match.findOne(
      { $or: [{ host: teamId }, { visitor: teamId }] },
      {
        __v: 0
      }
    )

    return res.status(200).send(match)
  } catch (error: any) {
    if (error?.value === 'NULL') {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
    } else {
      // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
      return res
        .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
        .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
    }
  }
}

async function createMatch(req: Request, res: Response) {
  const body = req?.body as IMatch

  const validTournament = await Tournament.findOne({ _id: body?.tournamentId })

  if (!validTournament) {
    return res
      .status(400)
      .send('You must provide a valid tournament id to create a match')
  }

  try {
    const result = await Match.create({
      ...body
    })

    return res.json(result)
  } catch (error: any) {
    if (error?.value === 'NULL') {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
    } else {
      console.error(error)
      // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
      res
        .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
        .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
    }
  }
}

async function updateMatch(req: Request, res: Response) {
  const body = req?.body as IMatch
  const matchId = req?.params?.matchId

  console.log({ matchId })

  try {
    const result = await Match.findOneAndUpdate({ _id: matchId }, body, {
      returnDocument: 'after'
    })

    if (result) {
      return res.status(200).send(result)
    } else {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.user)
    }
  } catch (error) {
    console.error(error)

    return res
      .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
      .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
  }
}

const MatchController = {
  getMatch,
  createMatch,
  updateMatch,
  getAllTeamMatches,
  getAllMatches
}

export default MatchController
