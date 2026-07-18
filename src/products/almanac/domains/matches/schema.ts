import {
  boolean,
  date,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { worldCupEditionTeams } from '../participations/schema';
import { worldCupSquadPlayers } from '../squads/schema';

const almanacSchema = pgSchema('almanac');

export const matches = almanacSchema.table(
  'matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceKey: text('source_key').notNull(),
    homeParticipationId: uuid('home_participation_id')
      .notNull()
      .references(() => worldCupEditionTeams.id, { onDelete: 'restrict' }),
    awayParticipationId: uuid('away_participation_id')
      .notNull()
      .references(() => worldCupEditionTeams.id, { onDelete: 'restrict' }),
    matchDate: date('match_date').notNull(),
    stage: text('stage').notNull(),
    groupName: text('group_name'),
    homeScore: smallint('home_score').notNull(),
    awayScore: smallint('away_score').notNull(),
    extraTime: boolean('extra_time').notNull(),
    penaltyShootout: boolean('penalty_shootout').notNull(),
    homePenaltyScore: smallint('home_penalty_score'),
    awayPenaltyScore: smallint('away_penalty_score'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex('matches_source_key_unique').on(table.sourceKey)]
);

export const goals = almanacSchema.table(
  'goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceKey: text('source_key').notNull(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    benefitingParticipationId: uuid('benefiting_participation_id')
      .notNull()
      .references(() => worldCupEditionTeams.id, { onDelete: 'restrict' }),
    creditedParticipationId: uuid('credited_participation_id')
      .notNull()
      .references(() => worldCupEditionTeams.id, { onDelete: 'restrict' }),
    creditedSquadPlayerId: uuid('credited_squad_player_id').references(
      () => worldCupSquadPlayers.id,
      { onDelete: 'restrict' }
    ),
    minuteRegulation: smallint('minute_regulation').notNull(),
    minuteStoppage: smallint('minute_stoppage').notNull(),
    matchPeriod: text('match_period').notNull(),
    ownGoal: boolean('own_goal').notNull(),
    penalty: boolean('penalty').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex('goals_source_key_unique').on(table.sourceKey)]
);
