import { Request, Response } from 'express'
import { ErrorMapper } from '../error-handling/mapper'
import { eq, and } from 'drizzle-orm'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import {
  InsertTournament,
  MATCH_TABLE,
  TOURNAMENT_TABLE
} from '../../../services/database/schema'
import db from '../../../services/database'
import { isNullable } from '../../../utils'
import { mapGloboEsportApiRound } from '../typing/data-providers/globo-esporte/api-mapper'
import axios from 'axios'

const toSQLReadyMatch = ({ match }: { match: any }) => {
  return {
    ...match,
    externalId: String(match.externalId),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    stadium: match.stadium,
    awayScore: isNullable(match.awayScore) ? null : String(match.awayScore),
    homeScore: isNullable(match.homeScore) ? null : String(match.homeScore),
    date: isNullable(match.date) ? null : new Date(match.date),
    time: isNullable(match.time) ? null : match.time,
    gameStarted: match.gameStarted
  }
}

async function getTournament(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId
  const roundId = req?.query.round || 1
  // const { id, label } = getTableColumns(TOURNAMENT_TABLE)
  // const { tournamentId, ...rest } = getTableColumns(MATCH_TABLE)

  try {
    const queryResult = await db
      .select()
      .from(TOURNAMENT_TABLE)
      .leftJoin(MATCH_TABLE, eq(TOURNAMENT_TABLE.id, MATCH_TABLE.tournamentId))
      .where(
        and(
          eq(TOURNAMENT_TABLE.id, tournamentId),
          eq(MATCH_TABLE.roundId, String(roundId))
        )
      )

    const { label, id } = queryResult[0].tournament
    const matches = queryResult.map(row => row.match)

    return res.status(200).send({
      id,
      label,
      matches
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
  const body = req?.body as InsertTournament

  if (!body.label) {
    return res.status(400).json({ message: 'You must provide a label for a tournament' })
  }

  try {
    const result = await db.insert(TOURNAMENT_TABLE).values({ label: body.label })

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
    const { targetUrl, mode, label } = req?.body

    if (!label) {
      return res
        .status(400)
        .json({ message: 'You must provide a label for a tournament' })
    }

    const tournamentQuery = await db
      .insert(TOURNAMENT_TABLE)
      .values({ label })
      .returning()
    const tournament = tournamentQuery[0]
    if (!tournament) return res.status(400).send('No tournament created')

    if (mode == 'running-points') {
      let ROUND = 1

      while (ROUND <= 38) {
        console.log(`[FETCHING DATA FOR ROUND ${ROUND}]`)

        const responseApiRound = await axios.get(`${targetUrl}/rodada/${ROUND}/jogos`)
        const dataApiRound = responseApiRound.data
        const mappeMatches = mapGloboEsportApiRound({
          matches: dataApiRound,
          roundId: String(ROUND),
          tournamentId: tournament.id
        })

        mappeMatches?.forEach(async match => {
          const insertValues = toSQLReadyMatch({ match })
          await db.insert(MATCH_TABLE).values(insertValues).returning()
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

        const responseApiRound = await axios.get(`${targetUrl}/rodada/${ROUND}/jogos`)
        const dataApiRound = responseApiRound.data
        const mappeMatches = mapGloboEsportApiRound({
          matches: dataApiRound,
          roundId: String(ROUND),
          tournamentId
        })

        mappeMatches?.forEach(async match => {
          const updateValues = toSQLReadyMatch({
            match
          })
          await db
            .update(MATCH_TABLE)
            .set(updateValues)
            .where(
              and(
                eq(MATCH_TABLE.externalId, String(match.externalId)),
                eq(MATCH_TABLE.tournamentId, tournamentId)
              )
            )
            .returning()
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

const TournamentController = {
  getTournament,
  getAllTournaments,
  createTournament,
  updateTournamentFromExternalSource,
  createTournamentFromExternalSource
}

export default TournamentController
