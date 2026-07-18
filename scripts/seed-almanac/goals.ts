import { sql } from 'drizzle-orm';
import { goals, matches } from '../../src/products/almanac/domains/matches/schema';
import type { GoalSourceRecord } from '../../src/products/almanac/domains/matches/types';
import { worldCupEditionTeams } from '../../src/products/almanac/domains/participations/schema';
import { worldCupSquadPlayers } from '../../src/products/almanac/domains/squads/schema';
import type { SeedTransaction } from './database';
import { readSeedSource } from './source';

const sourceGoals = readSeedSource<GoalSourceRecord>('goals.json');
const batchSize = 500;

export const seedGoals = async (
  transaction: SeedTransaction,
  updatedAt: Date
): Promise<number> => {
  const seededMatches = await transaction
    .select({ id: matches.id, sourceKey: matches.sourceKey })
    .from(matches);
  const matchesBySourceKey = new Map(
    seededMatches.map(match => [match.sourceKey, match.id])
  );
  const seededParticipations = await transaction
    .select({ id: worldCupEditionTeams.id, sourceKey: worldCupEditionTeams.sourceKey })
    .from(worldCupEditionTeams);
  const participationsBySourceKey = new Map(
    seededParticipations.map(participation => [participation.sourceKey, participation.id])
  );
  const seededSquadPlayers = await transaction
    .select({ id: worldCupSquadPlayers.id, sourceKey: worldCupSquadPlayers.sourceKey })
    .from(worldCupSquadPlayers);
  const squadPlayersBySourceKey = new Map(
    seededSquadPlayers.map(squadPlayer => [squadPlayer.sourceKey, squadPlayer.id])
  );

  const records = sourceGoals.map(goal => {
    const matchId = matchesBySourceKey.get(goal.matchId);
    const benefitingParticipationSourceKey = `${goal.worldCupId}:${goal.teamId}`;
    const creditedParticipationSourceKey = `${goal.worldCupId}:${goal.playerTeamId}`;
    const creditedSquadPlayerSourceKey = `${goal.worldCupId}:${goal.playerTeamId}:${goal.playerId}`;
    const benefitingParticipationId = participationsBySourceKey.get(
      benefitingParticipationSourceKey
    );
    const creditedParticipationId = participationsBySourceKey.get(
      creditedParticipationSourceKey
    );
    const creditedSquadPlayerId = squadPlayersBySourceKey.get(creditedSquadPlayerSourceKey);

    if (matchId === undefined) {
      throw new Error(`Unknown match source ${goal.matchId}`);
    }

    if (benefitingParticipationId === undefined) {
      throw new Error(
        `Unknown benefiting participation source ${benefitingParticipationSourceKey}`
      );
    }

    if (creditedParticipationId === undefined) {
      throw new Error(
        `Unknown credited participation source ${creditedParticipationSourceKey}`
      );
    }

    if (creditedSquadPlayerId === undefined) {
      throw new Error(`Unknown credited squad source ${creditedSquadPlayerSourceKey}`);
    }

    return {
      sourceKey: goal.id,
      matchId,
      benefitingParticipationId,
      creditedParticipationId,
      creditedSquadPlayerId,
      minuteRegulation: goal.minuteRegulation,
      minuteStoppage: goal.minuteStoppage,
      matchPeriod: goal.matchPeriod,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      updatedAt,
    };
  });

  for (let index = 0; index < records.length; index += batchSize) {
    await transaction
      .insert(goals)
      .values(records.slice(index, index + batchSize))
      .onConflictDoUpdate({
        target: goals.sourceKey,
        set: {
          matchId: sql`excluded.match_id`,
          benefitingParticipationId: sql`excluded.benefiting_participation_id`,
          creditedParticipationId: sql`excluded.credited_participation_id`,
          creditedSquadPlayerId: sql`excluded.credited_squad_player_id`,
          minuteRegulation: sql`excluded.minute_regulation`,
          minuteStoppage: sql`excluded.minute_stoppage`,
          matchPeriod: sql`excluded.match_period`,
          ownGoal: sql`excluded.own_goal`,
          penalty: sql`excluded.penalty`,
          updatedAt,
        },
      });
  }

  return records.length;
};
