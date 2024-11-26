import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const TTeam = pgTable('team', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  externalId: text('external_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})

export const InsertTeam = TTeam.$inferInsert
