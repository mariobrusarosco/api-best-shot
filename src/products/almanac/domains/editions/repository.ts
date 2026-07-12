import { count, desc, eq } from 'drizzle-orm';
import { db } from '../../../../platform/database';
import { worldCupEditionVisualIdentities, worldCupEditions } from './schema';

export type EditionIndexRecord = {
  id: string;
  year: number;
  hostDisplayName: string;
  hostFlagAssetKey: string | null;
};

export type EditionDetailRecord = {
  id: string;
  year: number;
  name: string;
  hostDisplayName: string;
  visualIdentity: {
    logoAssetKey: string | null;
    trophyAssetKey: string | null;
    accentColor: string;
    accentTextColor: string;
    spineColor: string;
  } | null;
};

export type EditionNavigationRecord = {
  id: string;
  year: number;
  hostDisplayName: string;
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

export const findEditionDetailRecordByYear = async (
  year: number
): Promise<EditionDetailRecord | null> => {
  const [record] = await db
    .select({
      id: worldCupEditions.id,
      year: worldCupEditions.year,
      name: worldCupEditions.name,
      hostDisplayName: worldCupEditions.hostDisplayName,
      visualIdentity: {
        logoAssetKey: worldCupEditionVisualIdentities.logoAssetKey,
        trophyAssetKey: worldCupEditionVisualIdentities.trophyAssetKey,
        accentColor: worldCupEditionVisualIdentities.accentColor,
        accentTextColor: worldCupEditionVisualIdentities.accentTextColor,
        spineColor: worldCupEditionVisualIdentities.spineColor,
      },
    })
    .from(worldCupEditions)
    .leftJoin(
      worldCupEditionVisualIdentities,
      eq(worldCupEditionVisualIdentities.editionId, worldCupEditions.id)
    )
    .where(eq(worldCupEditions.year, year))
    .limit(1);

  return record ?? null;
};

export const listEditionNavigationRecords = async (): Promise<EditionNavigationRecord[]> => {
  return db
    .select({
      id: worldCupEditions.id,
      year: worldCupEditions.year,
      hostDisplayName: worldCupEditions.hostDisplayName,
    })
    .from(worldCupEditions)
    .orderBy(desc(worldCupEditions.year));
};
