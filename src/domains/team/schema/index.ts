import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Team = pgTable(
  'team',
  {
    id: uuid('id').defaultRandom(),
    name: text('name').notNull(),
    externalId: text('external_id').notNull(),
    shortName: text('short_name'),
    badge: text('badge').notNull(),
    provider: text('provider').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.provider, table.externalId] }),
    };
  }
);

export type DB_InsertTeam = typeof T_Team.$inferInsert;
export type DB_UpdateTeam = typeof T_Team.$inferInsert;
export type DB_SelectTeam = typeof T_Team.$inferSelect;
