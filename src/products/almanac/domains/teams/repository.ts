import { asc } from 'drizzle-orm';
import { db } from '../../../../platform/database';
import { nationalTeams } from './schema';

export type NationalTeamRecord = {
  id: string;
  code: string;
  displayName: string;
  flagAssetKey: string | null;
};

export const listNationalTeamRecords = async (): Promise<NationalTeamRecord[]> => {
  return db
    .select({
      id: nationalTeams.id,
      code: nationalTeams.code,
      displayName: nationalTeams.displayName,
      flagAssetKey: nationalTeams.flagAssetKey,
    })
    .from(nationalTeams)
    .orderBy(asc(nationalTeams.displayName));
};
