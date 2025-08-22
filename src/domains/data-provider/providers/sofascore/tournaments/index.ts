import { IApiProvider } from '@/domains/data-provider/typing';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApi } from '@/utils';
import { and, eq } from 'drizzle-orm';

export const SofascoreTournament: IApiProvider['tournament'] = {
  createOnDatabase: async data => {
    const [tournament] = await db.insert(T_Tournament).values(data).returning();

    return tournament;
  },
  updateOnDatabase: async data => {
    const [tournament] = await db
      .update(T_Tournament)
      .set(data)
      .where(and(eq(T_Tournament.externalId, data.externalId), eq(T_Tournament.provider, data.provider)))
      .returning();

    return tournament;
  },
  fetchAndStoreLogo: async data => {
    const assetPath = await fetchAndStoreAssetFromApi(data);

    return `https://${process.env['AWS_CLOUDFRONT_URL']}/${assetPath}`;
  },
};
