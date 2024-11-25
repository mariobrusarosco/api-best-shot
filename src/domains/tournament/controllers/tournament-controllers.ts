import axios from 'axios'
import { and, eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import db from '../../../services/database'
import {
  InsertTournament,
  TMatch,
  TOURNAMENT_TABLE
} from '../../../services/database/schema'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import { ErrorMapper } from '../error-handling/mapper'
import {
  mapSofaScoreRoundApi,
  toSQLReady
} from '../typing/data-providers/sofascore/api-mapper'
import { SofaScoreRoundApi } from '../typing/data-providers/sofascore/typing'

async function getTournament(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId
  const roundId = req?.query.round || 1
  // const { id, label } = getTableColumns(TOURNAMENT_TABLE)
  // const { tournamentId, ...rest } = getTableColumns(TMatch)

  try {
    const queryResult = await db
      .select()
      .from(TOURNAMENT_TABLE)
      .leftJoin(TMatch, eq(TOURNAMENT_TABLE.id, TMatch.tournamentId))
      .where(
        and(eq(TOURNAMENT_TABLE.id, tournamentId), eq(TMatch.roundId, String(roundId)))
      )

    const { label, id, externalId, seasonId } = queryResult[0].tournament
    const matches = queryResult.map(row => row.match)

    return res.status(200).send({
      id,
      label,
      matches,
      externalId,
      seasonId
    })
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function getAllTournaments(_: Request, res: Response) {
  try {
    const result = await db.select().from(TOURNAMENT_TABLE)

    return res.status(200).send(result)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function createTournament(req: Request, res: Response) {
  const { targetUrl, mode, label, seasonId, externalId } =
    req?.body as InsertTournament & { targetUrl: string }

  if (!label) {
    return res.status(400).json({ message: 'You must provide a label for a tournament' })
  }

  try {
    const result = await db
      .insert(TOURNAMENT_TABLE)
      .values({ label, mode, seasonId, externalId })

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

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const { targetUrl, mode, label, seasonId, externalId } =
      req?.body as InsertTournament & { targetUrl: string }

    if (!label) {
      return res
        .status(400)
        .json({ message: 'You must provide a label for a tournament' })
    }

    const tournamentQuery = await db
      .insert(TOURNAMENT_TABLE)
      .values({ label, externalId, seasonId, mode })
      .returning()
    const tournament = tournamentQuery[0]

    if (!tournament) return res.status(400).send('No tournament created')

    if (mode == 'running-points') {
      let ROUND = 1

      while (ROUND <= 38) {
        console.log(`[FETCHING DATA FOR ROUND ${ROUND}]`)

        const responseApiRound = await axios.get(`${targetUrl}/${ROUND}`)
        const data = responseApiRound.data as SofaScoreRoundApi
        const mappedMatches = data.events.map(match =>
          mapSofaScoreRoundApi(match, tournament.id)
        )

        mappedMatches?.forEach(async match => {
          await db.insert(TMatch).values(toSQLReady({ match })).returning()

          console.log(`[DATA INSERTED FOR MATCH ${match.externalId}]`)
        })
        ROUND++
      }
    }

    return res.json('OK')
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function updateTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const { targetUrl, tournamentId, mode } = req?.body

    if (mode == 'running-points') {
      let ROUND = 1

      while (ROUND <= 38) {
        console.log(`[FETCHING DATA FOR ROUND ${ROUND}]`)

        const responseApiRound = await axios.get(`${targetUrl}/${ROUND}`)
        const data = responseApiRound.data as SofaScoreRoundApi
        const mappedMatches = data.events.map(match =>
          mapSofaScoreRoundApi(match, tournamentId)
        )

        mappedMatches?.forEach(async match => {
          const updateValues = toSQLReady({
            match
          })
          await db
            .update(TMatch)
            .set(updateValues)
            .where(
              and(
                eq(TMatch.externalId, String(match.externalId)),
                eq(TMatch.tournamentId, tournamentId)
              )
            )
            .returning()
          console.log(`[DATA UPDATE FOR MATCH ${match.externalId}]`)
        })
        ROUND++
      }
    }

    return res.json(false)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

const TournamentController = {
  getTournament,
  getAllTournaments,
  createTournament,
  updateTournamentFromExternalSource,
  createTournamentFromExternalSource
}

export default TournamentController
