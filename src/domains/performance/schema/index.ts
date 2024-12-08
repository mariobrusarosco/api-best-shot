import {
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const T_LeaguePerformance = pgTable(
  'league_performance',
  {
    id: uuid('id').notNull().defaultRandom(),
    memberId: uuid('member_id').notNull(),
    leagueId: uuid('league_id').notNull(),
    points: numeric('points'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.memberId, table.leagueId] }),
      uniquePerformance: uniqueIndex('unique_league_perfomance').on(
        table.memberId,
        table.leagueId
      ),
    };
  }
);

export type DB_SelectLeaguePerformance = typeof T_LeaguePerformance.$inferSelect;
export type DB_InsertLeaguePerformance = typeof T_LeaguePerformance.$inferInsert;
export type DB_UpdateLeaguePerformance = typeof T_LeaguePerformance.$inferInsert;

export const T_TournamentPerformance = pgTable(
  'tournament_performance',
  {
    id: uuid('id').notNull().defaultRandom(),
    memberId: uuid('member_id').notNull(),
    tournamentId: uuid('league_id').notNull(),
    points: numeric('points'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.memberId, table.tournamentId] }),
      uniquePerformance: uniqueIndex('unique_tournament_perfomance').on(
        table.memberId,
        table.tournamentId
      ),
    };
  }
);

export type DB_SelectTournamentPerformance = typeof T_TournamentPerformance.$inferSelect;
export type DB_InsertTournamentPerformance = typeof T_TournamentPerformance.$inferInsert;
export type DB_UpdateTournamentPerformance = typeof T_TournamentPerformance.$inferInsert;

// export const T_GuessStandings = pgTable(
//   'guess_standings',
//   {
//     id: uuid('id').notNull().defaultRandom(),
//     memberId: uuid('member_id').notNull(),
//     matchId: uuid('match_id').notNull(),
//     homeScore: numeric('home_score'),
//     awayScore: numeric('away_score'),
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//     updatedAt: timestamp('updated_at')
//       .notNull()
//       .defaultNow()
//       .$onUpdate(() => new Date()),
//   },
//   table => {
//     return {
//       pk: primaryKey({ columns: [table.matchId, table.memberId] }),
//       uniqueGuess: uniqueIndex('unique_guess').on(table.matchId, table.memberId),
//     };
//   }
// );
