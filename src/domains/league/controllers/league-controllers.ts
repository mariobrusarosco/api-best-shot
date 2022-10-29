import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import { ErrorMapper } from '../error-handling/mapper'

import League, { ILeague } from '../schema'

async function getAllLeagues(req: Request, res: Response) {
  const token = req.headers.token

  try {
    const allLeagues = await League.find(
      { members: token },
      {
        __v: 0
      }
    )
    return res.status(200).send(allLeagues)
  } catch (error) {
    // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
    return res
      .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
      .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
  }
}

async function getLeague(req: Request, res: Response) {
  const leagueId = req?.params.leagueId

  try {
    const league = await League.findOne(
      { _id: leagueId },
      {
        __v: 0
      }
    )

    return res.status(200).send(league)
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

async function createLeague(req: Request, res: Response) {
  const body = req?.body as ILeague

  if (!body.label) {
    return res
      .status(400)
      .json({ message: 'You must provide a label to update a league' })
  }

  try {
    const result = await League.create({
      ...body
    })

    res.json(result)
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

async function updateLeague(req: Request, res: Response) {
  const body = req?.body as ILeague
  const leagueId = req?.params?.leagueId

  if (!body.label) {
    return res.status(400).json(ErrorMapper.MISSING_LABEL)
  }

  console.log({ body })

  try {
    const result = await League.findOneAndUpdate({ _id: leagueId }, body, {
      returnDocument: 'after'
    })

    res.json(result)
  } catch (error) {
    console.error(error)
    return res
      .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
      .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
  }
}

const TournamentController = {
  getLeague,
  getAllLeagues,
  createLeague,
  updateLeague
}

export default TournamentController
