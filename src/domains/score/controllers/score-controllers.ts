import { Column, eq, sql } from 'drizzle-orm'
import { Request, Response } from 'express'
import db from '../../../services/database'
import {
  LEAGUE_ROLE_TABLE,
  MEMBER_TABLE,
  TGuess,
  TMatch
} from '../../../services/database/schema'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import { analyzeScore } from './score-computation'

const toNumber = (col: Column) => {
  return sql<number>`${col}`.mapWith(Number)
}

async function getLeagueScore(req: Request, res: Response) {
  const leagueId = req?.params.leagueId as string

  try {
    // TODO subquery???
    const query = await db
      .select()
      .from(TGuess)
      .leftJoin(LEAGUE_ROLE_TABLE, eq(TGuess.memberId, LEAGUE_ROLE_TABLE.memberId))
      .leftJoin(TMatch, eq(TMatch.id, TGuess.matchId))
      .leftJoin(MEMBER_TABLE, eq(MEMBER_TABLE.id, TGuess.memberId))
      .where(eq(LEAGUE_ROLE_TABLE.leagueId, leagueId))

    const scoreboard = {} as Record<string, number>

    query.forEach(row => {
      const member = row?.member?.nickName as string
      const guessScore = analyzeScore(row.guess, row.match)

      if (scoreboard[member]) {
        scoreboard[member] += guessScore.TOTAL
      } else {
        scoreboard[member] = guessScore.TOTAL
      }
    })

    return res.status(200).send(scoreboard)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

const GuessController = {
  getLeagueScore
}

export default GuessController
