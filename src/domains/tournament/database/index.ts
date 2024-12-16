import { ACTIVE_API_PROVIDER } from '@/domains/data-provider-v2';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { T_Tournament } from '../schema';

const queryAllTournaments = async () => {
  try {
    return db
      .select()
      .from(T_Tournament)
      .where(eq(T_Tournament.provider, ACTIVE_API_PROVIDER));
  } catch (error: any) {
    console.error('[DB_Tournament] - [queryAllMemberTournaments]', error);
  }
};

export const DB_Tournament = {
  queryAllTournaments,
};
