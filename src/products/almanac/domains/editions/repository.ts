import { desc } from 'drizzle-orm';
import { db } from '../../../../platform/database';
import { worldCupEditions } from './schema';

export type WorldCupEditionListItem = {
  id: string;
  year: number;
  name: string;
  host: {
    displayName: string;
    assetPath: string | null;
  };
};

export const listWorldCupEditions = async (): Promise<WorldCupEditionListItem[]> => {
  const rows = await db
    .select({
      id: worldCupEditions.id,
      year: worldCupEditions.year,
      name: worldCupEditions.name,
      hostDisplayName: worldCupEditions.hostDisplayName,
      hostAssetPath: worldCupEditions.hostAssetPath,
    })
    .from(worldCupEditions)
    .orderBy(desc(worldCupEditions.year));

  return rows.map(row => ({
    id: row.id,
    year: row.year,
    name: row.name,
    host: {
      displayName: row.hostDisplayName,
      assetPath: row.hostAssetPath,
    },
  }));
};
