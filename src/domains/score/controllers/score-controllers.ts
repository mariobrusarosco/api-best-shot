import { type SelectGuess, TGuess } from '@/domains/guess/schema'
import { type SelectMatch, TMatch } from '@/domains/match/schema'
import { type SelectMember, TMember } from '@/domains/member/schema'
import { type SelectTournament, TTournament } from '@/domains/tournament/schema'

import db from '@/services/database'
import { and, Column, eq, gte, lte, sql } from 'drizzle-orm'
import { Request, Response } from 'express'
import { TLegueRole } from '../../../services/database/schema'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'

import { createLeaderboard } from './score-computation'

const toNumber = (col: Column) => {
  return sql<number>`${col}`.mapWith(Number)
}

export interface LeagueScoreQuery {
  member: SelectMember
  match: SelectMatch
  guess: SelectGuess
  tournament: SelectTournament
}

async function getLeagueScore(req: Request, res: Response) {
  const leagueId = req?.params.leagueId as string

  try {
    // TODO subquery???
    const query = (await db
      .select()
      .from(TGuess)
      .leftJoin(TLegueRole, eq(TGuess.memberId, TLegueRole.memberId))
      .leftJoin(TMatch, eq(TMatch.id, TGuess.matchId))
      .leftJoin(TMember, eq(TMember.id, TGuess.memberId))
      .leftJoin(TTournament, eq(TTournament.id, TGuess.tournamentId))
      .where(
        and(
          eq(TLegueRole.leagueId, leagueId),
          gte(TMatch.date, new Date('2024-01-01')),
          lte(TMatch.date, new Date('2024-12-31'))
        )
      )) as LeagueScoreQuery[]

    const serializedScoreboard = createLeaderboard(query)

    return res.status(200).send(serializedScoreboard)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function getTournamentScore(tournamentId: string, req: Request, res: Response) {
  try {
    console.log(tournamentId)
    return res.status(200).send(null)
  } catch (error: any) {
    console.error('[GET] - [GUESS]', error)
    return handleInternalServerErrorResponse(res, error)
  }
}

const GuessController = {
  getLeagueScore,
  getTournamentScore
}

export default GuessController
