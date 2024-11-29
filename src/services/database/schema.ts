import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export * from '../../domains/guess/schema'
export * from '../../domains/league/schema'
export * from '../../domains/match/schema'
export * from '../../domains/member/schema'
export * from '../../domains/team/schema'
export * from '../../domains/tournament/schema'

export const TOURNAMENT_EXTERNAL_ID = pgTable('tournament_external_id', {
  tournamentId: uuid('tournament_id').notNull(),
  externalId: text('external_id').notNull().primaryKey(),
  provider: text('provider').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})
