import { ACTIVE_API_PROVIDER } from '@/domains/data-provider-v2';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { T_Tournament } from '../schema';

const allTournaments = async () => {
  try {
    return db
      .select()
      .from(T_Tournament)
      .where(eq(T_Tournament.provider, ACTIVE_API_PROVIDER));
  } catch (error: any) {
    console.error('[Query_Tournament] - [queryAllMemberTournaments]', error);
  }
};

const tournament = async (tournamenId: string) => {
  try {
    const [tournament] = await db
      .select()
      .from(T_Tournament)
      .where(
        and(
          eq(T_Tournament.provider, ACTIVE_API_PROVIDER),
          eq(T_Tournament.id, tournamenId)
        )
      );
    return tournament;
  } catch (error: any) {
    console.error('[Query_Tournament] - [queryTournament]', error);
  }
};

export const TournamentQueries = {
  allTournaments,
  tournament,
};
