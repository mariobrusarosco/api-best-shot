import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import { ErrorMapper } from '../error-handling/mapper'
import { eq, and, getTableColumns } from 'drizzle-orm'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import {
  InsertTournament,
  MATCH_TABLE,
  TOURNAMENT_EXTERNAL_ID,
  TOURNAMENT_TABLE
} from '../../../services/database/schema'
import db from '../../../services/database'
import { mapRound, parseBuiltInTournament } from './parse-builtin-tournament'
import { ApiRound } from '../typing/typing'
import { isNullable } from '../../../utils'

const toSQLReadyMatch = ({
  tournamentId,
  roundId,
  match
}: {
  tournamentId: string
  roundId: number
  match: any
}) => {
  return {
    externalId: String(match.externalId),
    tournamentId: tournamentId,
    roundId: String(roundId),
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

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const tournamentId = req?.params.tournamentId
    const rounds = parseBuiltInTournament(tournamentId)

    rounds.forEach(async (round: ApiRound) => {
      const parsedRound = mapRound(round)
      const matches = parsedRound.matches
      const roundId = parsedRound.id

      matches.forEach(async match => {
        console.log('INSERTING ....', isNullable(match.awayScore), match.awayScore)

        await db
          .insert(MATCH_TABLE)
          .values(toSQLReadyMatch({ tournamentId, roundId, match }))
          .returning()
      })
    })

    return res.json('OK')
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function updateTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const tournamentId = req?.params.tournamentId
    const tournament = parseBuiltInTournament(tournamentId)

    tournament.forEach(async (round: ApiRound) => {
      const parsedRound = mapRound(round)
      const matches = parsedRound.matches
      const roundId = parsedRound.id

      matches.forEach(async match => {
        console.log('UPDATING ....', match.externalId, new Date(match.date))

        const result = await db
          .update(MATCH_TABLE)
          .set(toSQLReadyMatch({ tournamentId, roundId, match }))
          .where(
            and(
              eq(MATCH_TABLE.externalId, String(match.externalId)),
              eq(MATCH_TABLE.tournamentId, tournamentId)
            )
          )
          .returning()

        console.log('result ....', result[0])
      })
    })

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
