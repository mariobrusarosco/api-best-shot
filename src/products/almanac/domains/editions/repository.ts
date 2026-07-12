import { count, desc } from 'drizzle-orm';
import { db } from '../../../../platform/database';
import { worldCupEditions } from './schema';

export type EditionIndexRecord = {
  id: string;
  year: number;
  hostDisplayName: string;
  hostFlagAssetKey: string | null;
};

export const listEditionIndexRecords = async (): Promise<EditionIndexRecord[]> => {
  return db
    .select({
      id: worldCupEditions.id,
      year: worldCupEditions.year,
      hostDisplayName: worldCupEditions.hostDisplayName,
      hostFlagAssetKey: worldCupEditions.hostFlagAssetKey,
    })
    .from(worldCupEditions)
    .orderBy(desc(worldCupEditions.year));
};

export const countWorldCupEditionRecords = async (): Promise<number> => {
  const [result] = await db.select({ count: count() }).from(worldCupEditions);

  return result.count;
};
