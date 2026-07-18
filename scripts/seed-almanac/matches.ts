import { sql } from 'drizzle-orm';
import { matches } from '../../src/products/almanac/domains/matches/schema';
import type { MatchSourceRecord } from '../../src/products/almanac/domains/matches/types';
import { worldCupEditionTeams } from '../../src/products/almanac/domains/participations/schema';
import type { SeedTransaction } from './database';
import { readSeedSource } from './source';

const sourceMatches = readSeedSource<MatchSourceRecord>('matches.json');
const batchSize = 250;

export const seedMatches = async (
  transaction: SeedTransaction,
  updatedAt: Date
): Promise<number> => {
  const seededParticipations = await transaction
    .select({ id: worldCupEditionTeams.id, sourceKey: worldCupEditionTeams.sourceKey })
    .from(worldCupEditionTeams);
  const participationsBySourceKey = new Map(
    seededParticipations.map(participation => [participation.sourceKey, participation.id])
  );

  const records = sourceMatches.map(match => {
    const homeParticipationSourceKey = `${match.worldCupId}:${match.homeTeamId}`;
    const awayParticipationSourceKey = `${match.worldCupId}:${match.awayTeamId}`;
    const homeParticipationId = participationsBySourceKey.get(homeParticipationSourceKey);
    const awayParticipationId = participationsBySourceKey.get(awayParticipationSourceKey);

    if (homeParticipationId === undefined) {
      throw new Error(`Unknown home participation source ${homeParticipationSourceKey}`);
    }

    if (awayParticipationId === undefined) {
      throw new Error(`Unknown away participation source ${awayParticipationSourceKey}`);
    }

    return {
      sourceKey: match.id,
      homeParticipationId,
      awayParticipationId,
      matchDate: match.matchDate,
      stage: match.stage,
      groupName: match.groupName,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      extraTime: match.extraTime,
      penaltyShootout: match.penaltyShootout,
      homePenaltyScore: match.homePenaltyScore,
      awayPenaltyScore: match.awayPenaltyScore,
      updatedAt,
    };
  });

  for (let index = 0; index < records.length; index += batchSize) {
    await transaction
      .insert(matches)
      .values(records.slice(index, index + batchSize))
      .onConflictDoUpdate({
        target: matches.sourceKey,
        set: {
          homeParticipationId: sql`excluded.home_participation_id`,
          awayParticipationId: sql`excluded.away_participation_id`,
          matchDate: sql`excluded.match_date`,
          stage: sql`excluded.stage`,
          groupName: sql`excluded.group_name`,
          homeScore: sql`excluded.home_score`,
          awayScore: sql`excluded.away_score`,
          extraTime: sql`excluded.extra_time`,
          penaltyShootout: sql`excluded.penalty_shootout`,
          homePenaltyScore: sql`excluded.home_penalty_score`,
          awayPenaltyScore: sql`excluded.away_penalty_score`,
          updatedAt,
        },
      });
  }

  return records.length;
};
