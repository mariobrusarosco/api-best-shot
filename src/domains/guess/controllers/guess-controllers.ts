import { Request, Response } from 'express'
import { eq, and, sql, Column } from 'drizzle-orm'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import { GUESS_TABLE, InsertGuess } from '../../../services/database/schema'
import db from '../../../services/database'

const toNumber = (col: Column) => {
  return sql<number>`${col}`.mapWith(Number)
}

async function getMemberGuesses(req: Request, res: Response) {
  const memberId = req?.query.memberId as string
  const tournamentId = req?.query.tournamentId as string

  try {
    const guesses = await db
      .select({
        memberId: GUESS_TABLE.memberId,
        matchId: GUESS_TABLE.matchId,
        tournamentId: GUESS_TABLE.tournamentId,
        homeScore: toNumber(GUESS_TABLE.homeScore),
        awayScore: toNumber(GUESS_TABLE.awayScore)
      })
      .from(GUESS_TABLE)
      .where(
        and(
          eq(GUESS_TABLE.memberId, memberId),
          eq(GUESS_TABLE.tournamentId, tournamentId)
        )
      )

    return res.status(200).send(guesses)
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
        matchId: body.matchId,
        awayScore: body.awayScore,
        homeScore: body.homeScore,
        memberId: body.memberId,
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
  getMemberGuesses,
  createGuess
}

export default GuessController
