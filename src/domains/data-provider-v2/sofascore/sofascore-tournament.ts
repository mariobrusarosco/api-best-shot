import { DB_InsertTournament, T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApiNew } from '@/utils';
import { and, eq } from 'drizzle-orm';
import { IApiProviderV2 } from '../interface';

export const SofascoreTournament: IApiProviderV2['tournament'] = {
  createOnDatabase: async (data): Promise<DB_InsertTournament> => {
    const [tournament] = await db.insert(T_Tournament).values(data).returning();

    return tournament;
  },
  updateOnDatabase: async (data): Promise<DB_InsertTournament> => {
    const [tournament] = await db
      .update(T_Tournament)
      .set(data)
      .where(
        and(
          eq(T_Tournament.externalId, data.externalId),
          eq(T_Tournament.provider, data.provider)
        )
      );

    return tournament;
  },
  fetchAndStoreLogo: async data => {
    const assetPath = await fetchAndStoreAssetFromApiNew(data);

    return `https://${process.env['AWS_CLOUDFRONT_URL']}/${assetPath}`;
  },
};
