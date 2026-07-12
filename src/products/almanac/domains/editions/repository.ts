import { desc } from 'drizzle-orm';
import { db } from '../../../../platform/database';
import { worldCupEditions } from './schema';

export type WorldCupEditionRecord = {
  id: string;
  year: number;
  name: string;
  hostDisplayName: string;
  logoAssetKey: string | null;
};

export const listWorldCupEditionRecords = async (): Promise<WorldCupEditionRecord[]> => {
  return db
    .select({
      id: worldCupEditions.id,
      year: worldCupEditions.year,
      name: worldCupEditions.name,
      hostDisplayName: worldCupEditions.hostDisplayName,
      logoAssetKey: worldCupEditions.logoAssetKey,
    })
    .from(worldCupEditions)
    .orderBy(desc(worldCupEditions.year));
};
