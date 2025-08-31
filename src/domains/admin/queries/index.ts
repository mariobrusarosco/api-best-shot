import { DatabaseError } from '@/domains/shared/error-handling/database';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';

const adminAllTournaments = async () => {
  try {
    console.log('adminAllTournaments');
    return db
      .select({
        id: T_Tournament.id,
        label: T_Tournament.label,
        logo: T_Tournament.logo,
        standingsMode: T_Tournament.standingsMode,
        season: T_Tournament.season,
        provider: T_Tournament.provider,
      })
      .from(T_Tournament);
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[Query_Tournament] - [queryAllMemberTournaments]', dbError);
    throw error;
  }
};

export const QUERIES_ADMIN_TOURNAMENT = {
  adminAllTournaments,
};
