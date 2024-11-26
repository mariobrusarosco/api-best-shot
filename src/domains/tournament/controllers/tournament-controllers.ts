import axios from 'axios'
import { aliasedTable, and, eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import db from '../../../services/database'

import { TMatch } from '@/domains/match/schema'
import { TTeam } from '@/domains/team/schema'
import { InsertTournament, TTournament } from '@/domains/tournament/schema'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import { Provider } from '../typing/data-providers/globo-esporte/api-mapper'
import { mapSofaScoreRoundApi } from '../typing/data-providers/sofascore/api-mapper'
import { SofaScoreRoundApi } from '../typing/data-providers/sofascore/typing'
import { createTournamentOnDatabase } from '../utils'
import { SQLHelper } from './sql-helper'

async function getTournament(req: Request, res: Response) {
  const tournamentId = req?.params.tournamentId
  const roundId = req?.query.round || 1
  // const { id, label } = getTableColumns(TTournament)
  // const { tournamentId, ...rest } = getTableColumns(TMatch)
  const homeTeam = aliasedTable(TTeam, 'homeTeam')
  const awayTeam = aliasedTable(TTeam, 'awayTeam')

  try {
    const matches = await db
      .select({
        matchId: TMatch.id,
        roundId: TMatch.roundId,
        tournamentId: TMatch.tournamentId,
        homeTeamShortName: homeTeam.shortName,
        awayTeamShortName: awayTeam.shortName,
        date: TMatch.date,
        status: TMatch.status,
        homeScore: TMatch.homeScore,
        awayScore: TMatch.awayScore
      })
      .from(TMatch)
      .leftJoin(homeTeam, eq(TMatch.homeTeamId, homeTeam.externalId))
      .leftJoin(awayTeam, eq(TMatch.awayTeamId, awayTeam.externalId))
      .where(
        and(eq(TMatch.roundId, String(roundId)), eq(TMatch.tournamentId, tournamentId))
      )

    console.log('Matches found:', matches.length)
    return res.status(200).send(matches)
  } catch (error: any) {
    console.error('Error fetching matches:', error)
    return handleInternalServerErrorResponse(res, error)
  }
}

async function getAllTournaments(_: Request, res: Response) {
  try {
    const result = await db.select().from(TTournament)

    return res.status(200).send(result)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as InsertTournament & { provider: string }

    if (!body.label) {
      return res
        .status(400)
        .json({ message: 'You must provide a label for a tournament' })
    }

    console.log(`[CREATING ${body.label}]`, body)

    const tournamentSQL = SQLHelper.parseTournament(body)

    const [tournament] = await createTournamentOnDatabase(tournamentSQL)

    if (!tournament) return res.status(400).send('No tournament created')

    let ROUND = 1

    while (ROUND <= Number(1)) {
      const url = Provider.getURL(tournament, ROUND)
      console.log(`[FETCHING DATA FOR ROUND ${ROUND} at ${url}]`)

      const responseApiRound = await axios.get(url)
      // const round = Provider.mapRoundFromAPI({
      //   tournamentId: tournament.externalId,
      //   roundId: ROUND,
      //   roundData: responseApiRound.data
      // })

      const matches = Provider.mapData({
        tournamentId: tournament.externalId,
        roundId: ROUND,
        rawData: responseApiRound.data
      })

      matches.forEach(async match => {
        const createdMatch = await Provider.createMatchOnDatabase(match)

        // const homeTeam = Provider.upsertTeamOnDatabase(match.teams.home)
        // const awayTeam = Provider.upsertTeamOnDatabase(match.teams.away)

        console.log(`[MATCH CREATED]`, createdMatch)
        // console.log(`[HOME TEAM CREATED ${homeTeam}]`)
        // console.log(`[AWAY TEAM CREATED ${awayTeam}]`)
      })

      //     mappedMatches?.forEach(async match => {
      //       const matchSQL = SQLHelper.parseMatch(match)
      //       const createdMatch = await createMatchOnDatabase(matchSQL)

      //       const homeTeamSQL = SQLHelper.parseTeam(matchSQL.home)
      //       const awayTeamSQL = SQLHelper.parseTeam(matchSQL.away)

      //       const homeTeam = await upsertTeamOnDatabase(homeTeamSQL)
      //       const awayTeam = await upsertTeamOnDatabase(awayTeamSQL)

      //       console.log(`[DATA INSERTED FOR MATCH ${match.externalId}]`)
      //       console.log(`[HOME TEAM CREATED ${homeTeam}]`)
      //       console.log(`[AWAY TEAM CREATED ${awayTeam}]`)
      //     })

      ROUND++
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
          // const matchToUpdate = SQLHelper.parseMatch(match)
          // const createdMatch = await Provider.createMatchOnDatabase(matchToUpdate)
          // console.log(`[DATA UPDATE FOR MATCH ${match.externalId}]`)
          // const homeTeamSQL = SQLHelper.parseTeam(matchToUpdate.home)
          // const awayTeamSQL = SQLHelper.parseTeam(matchToUpdate.away)
          // const homeTeam = await upsertTeamOnDatabase(homeTeamSQL)
          // const awayTeam = await upsertTeamOnDatabase(awayTeamSQL)
          // console.log(`[DATA INSERTED FOR MATCH ${match.externalId}]`)
          // console.log(`[HOME TEAM CREATED ${homeTeam}]`)
          // console.log(`[AWAY TEAM CREATED ${awayTeam}]`)
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
  updateTournamentFromExternalSource,
  createTournamentFromExternalSource
}

export default TournamentController
