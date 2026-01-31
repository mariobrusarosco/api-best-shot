import { T_Member } from '@/domains/member/schema';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const T_League = pgTable(
  'league',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    founderId: uuid('founder_id')
      .notNull()
      .references(() => T_Member.id, { onDelete: 'restrict' }), // ✅ FK to Member (Restrict)
    label: text('label').unique().notNull(), // ✅ Required
    description: text('description'),
    deletedAt: timestamp('deleted_at'), // ✅ Soft Delete
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    founderIdx: index('league_founder_idx').on(table.founderId), // ✅ Performance Index
  })
);

export type InsertLeague = typeof T_League.$inferInsert;
export type SelectLeague = typeof T_League.$inferSelect;

export const T_LeagueRole = pgTable(
  'league_role',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => T_League.id, { onDelete: 'cascade' }), // ✅ FK + Cascade
    memberId: uuid('member_id')
      .notNull()
      .references(() => T_Member.id, { onDelete: 'cascade' }), // ✅ FK + Cascade
    role: text('role', {
      enum: ['admin', 'member', 'viewer'],
    }).notNull(), // ✅ Role Enum
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueLeagueMember: uniqueIndex('league_role_league_member_idx').on(table.leagueId, table.memberId), // ✅ Unique Role
    leagueIdx: index('league_role_league_idx').on(table.leagueId),
    memberIdx: index('league_role_member_idx').on(table.memberId),
  })
);

import { T_Tournament } from '@/domains/tournament/schema';

export const T_LeagueTournament = pgTable(
  'league_tournament',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => T_League.id, { onDelete: 'cascade' }), // ✅ FK + Cascade
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }), // ✅ FK + Cascade
    status: text('status', {
      enum: ['active', 'completed', 'upcoming'],
    })
      .notNull()
      .default('active'), // ✅ Status Enum
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueLeagueTournament: uniqueIndex('unique_league_tournament').on(table.leagueId, table.tournamentId), // ✅ Unique Constraint
    leagueIdx: index('league_tournament_league_idx').on(table.leagueId),
    tournamentIdx: index('league_tournament_tournament_idx').on(table.tournamentId),
  })
);

export type InsertLeagueTournament = typeof T_LeagueTournament.$inferInsert;
export type UpdateLeagueTournament = typeof T_LeagueTournament.$inferInsert;
export type SelectLeagueTournament = typeof T_LeagueTournament.$inferSelect;
