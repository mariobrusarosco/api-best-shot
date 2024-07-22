import { Request, Response } from 'express'
import { eq, and, sql, Column } from 'drizzle-orm'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import {
  GUESS_TABLE,
  InsertGuess,
  LEAGUE_ROLE_TABLE
} from '../../../services/database/schema'
import db from '../../../services/database'

const toNumber = (col: Column) => {
  return sql<number>`${col}`.mapWith(Number)
}

async function getLeagueScore(req: Request, res: Response) {
  const leagueId = req?.params.leagueId as string

  console.log('---------score', req.params)
  try {
    const score = await db
      .select()
      .from(LEAGUE_ROLE_TABLE)
      .innerJoin(GUESS_TABLE, eq(LEAGUE_ROLE_TABLE.memberId, GUESS_TABLE.memberId))
      .where(eq(LEAGUE_ROLE_TABLE.leagueId, leagueId))

    return res.status(200).send(score)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function createGuess(req: Request, res: Response) {
  const body = req?.body as InsertGuess

  try {
    const result = await db
      .insert(GUESS_TABLE)
      .values({
        awayScore: body.awayScore,
        homeScore: body.homeScore,
        memberId: body.memberId,
        matchId: body.matchId,
        tournamentId: body.tournamentId
      })
      .onConflictDoUpdate({
        target: [GUESS_TABLE.memberId, GUESS_TABLE.matchId],
        set: {
          awayScore: sql`excluded.away_score`,
          homeScore: sql`excluded.home_score`
        }
      })
      .returning()

    return res.status(200).send(result)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

const GuessController = {
  getLeagueScore,
  createGuess
}

export default GuessController
