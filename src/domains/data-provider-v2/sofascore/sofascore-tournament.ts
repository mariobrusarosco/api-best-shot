import { DB_InsertTournament, T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { IApiProviderV2 } from '../interface';

export const SofascoreTournament: IApiProviderV2['tournament'] = {
  createOnDatabase: async (data): Promise<DB_InsertTournament> => {
    const [tournament] = await db.insert(T_Tournament).values(data).returning();

    return tournament;
  },
};
