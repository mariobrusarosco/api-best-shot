import {
  index,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { worldCupEditions } from "../editions/schema";
import { nationalTeams } from "../teams/schema";

const almanacSchema = pgSchema("almanac");

export const worldCupEditionTeams = almanacSchema.table(
  "world_cup_edition_teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceKey: text("source_key").notNull(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => worldCupEditions.id, { onDelete: "restrict" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => nationalTeams.id, { onDelete: "restrict" }),
    finalPosition: smallint("final_position").notNull(),
    officialFinalPosition: smallint("official_final_position"),
    finalPositionSource: text("final_position_source").notNull(),
    finalStage: text("final_stage").notNull(),
    matchesPlayed: smallint("matches_played").notNull(),
    wins: smallint("wins").notNull(),
    draws: smallint("draws").notNull(),
    losses: smallint("losses").notNull(),
    goalsFor: smallint("goals_for").notNull(),
    goalsAgainst: smallint("goals_against").notNull(),
    points: smallint("points"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("world_cup_edition_teams_source_key_unique").on(
      table.sourceKey,
    ),
    uniqueIndex("world_cup_edition_teams_edition_team_unique").on(
      table.editionId,
      table.teamId,
    ),
    uniqueIndex("world_cup_edition_teams_edition_final_position_unique").on(
      table.editionId,
      table.finalPosition,
    ),
    index("world_cup_edition_teams_team_id_index").on(table.teamId),
  ],
);
