import { InsertTournament, TTournament } from '@/domains/tournament/schema'
import db from '@/services/database'
import { and, eq } from 'drizzle-orm'
import { TMatch } from '../match/schema'
import { TTeam } from '../team/schema'
import { SQLHelper } from './controllers/sql-helper'

export const updateMatchOnDatabase = async (
  match: ReturnType<typeof SQLHelper.parseMatch>
) => {
  return await db
    .update(TMatch)
    .set(match)
    .where(and(eq(TMatch.externalId, String(match.externalId))))
    .returning()
}

export const upsertTeamOnDatabase = async (
  team: ReturnType<typeof SQLHelper.parseTeam>
) => {
  return await db
    .insert(TTeam)
    .values(team)
    .onConflictDoUpdate({
      target: TTeam.externalId,
      set: {
        name: team.name,
        shortName: team.shortName,
        externalId: String(team.externalId)
      }
    })
}

export const createTournamentOnDatabase = async (tournament: InsertTournament) => {
  const tournamentQuery = await db.insert(TTournament).values(tournament).returning()

  return tournamentQuery
}
