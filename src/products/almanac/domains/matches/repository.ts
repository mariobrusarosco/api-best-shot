import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '../../../../platform/database';
import { goals } from './schema';

export type CreditedScorerTotalRecord = {
  squadPlayerId: string;
  goalCount: number;
};

export const listCreditedScorerTotalRecords = async (): Promise<
  CreditedScorerTotalRecord[]
> => {
  const records = await db
    .select({
      squadPlayerId: goals.creditedSquadPlayerId,
      goalCount: count(goals.id),
    })
    .from(goals)
    .where(and(eq(goals.ownGoal, false), isNotNull(goals.creditedSquadPlayerId)))
    .groupBy(goals.creditedSquadPlayerId)
    .orderBy(desc(count(goals.id)));

  return records.map(record => {
    if (record.squadPlayerId === null) {
      throw new Error('Credited scorer aggregate contains no squad player');
    }

    return {
      squadPlayerId: record.squadPlayerId,
      goalCount: record.goalCount,
    };
  });
};
