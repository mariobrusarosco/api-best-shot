import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const TLeague = pgTable('league', {
  id: uuid('id').defaultRandom().primaryKey(),
  founderId: uuid('founder_id').notNull(),
  label: text('label').unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type InsertLeague = typeof TLeague.$inferInsert;
export type SelectLeague = typeof TLeague.$inferSelect;

export const TLeagueRole = pgTable('league_role', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').notNull(),
  memberId: uuid('member_id').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
