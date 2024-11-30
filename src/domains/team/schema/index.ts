import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const TTeam = pgTable('team', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  externalId: text('external_id').unique().notNull(),
  shortName: text('short_name'),
  badge: text('badge'),
  provider: text('provider').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type InsertTeam = typeof TTeam.$inferInsert;
