import { Request, Response } from 'express'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import { LEAGUE_ROLE_TABLE, LEAGUE_TABLE } from '../../../services/database/schema'
import db from '../../../services/database'
import { eq } from 'drizzle-orm'

const getLeagues = async (req: Request, res: Response) => {
  const memberId = (req?.query?.memberId || '') as string

  try {
    const memberLeages = await db
      .select({
        label: LEAGUE_TABLE.label,
        description: LEAGUE_TABLE.description,
        id: LEAGUE_TABLE.id
      })
      .from(LEAGUE_TABLE)
      .innerJoin(LEAGUE_ROLE_TABLE, eq(LEAGUE_TABLE.id, LEAGUE_ROLE_TABLE.leagueId))
      .where(eq(LEAGUE_ROLE_TABLE.memberId, memberId))

    return res.status(200).send(memberLeages)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

const createLeague = async (req: Request, res: Response) => {
  const { label, description, founderId } = req.body

  try {
    const query = await db
      .insert(LEAGUE_TABLE)
      .values({
        label,
        description,
        founderId
      })
      .returning()

    const league = query.at(0)

    if (!league) {
      return res.status(400).send({ message: 'League not created' })
    }

    await db.insert(LEAGUE_ROLE_TABLE).values({
      leagueId: league.id,
      memberId: founderId,
      role: 'ADMIN'
    })

    return res.status(201).send(league)
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

const inviteToLeague = async (req: Request, res: Response) => {
  const { leagueId, guestId } = req.body

  try {
    await db
      .insert(LEAGUE_ROLE_TABLE)
      .values({
        leagueId,
        memberId: guestId,
        role: 'GUEST'
      })
      .returning()

    return res.status(201).send('user invited to league')
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

const LeagueController = {
  getLeagues,
  createLeague,
  inviteToLeague
}

export default LeagueController
