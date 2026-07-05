import db from '@/core/database';
import type { TournamentCreateInsertInput } from '@/domains/data-provider-v2/contracts/tournament-create';
import type { DB_SelectTournament } from '@/domains/tournament/schema';
import { T_Tournament } from '@/domains/tournament/schema';

export const insertTournament = async (input: {
  tournament: TournamentCreateInsertInput;
}): Promise<DB_SelectTournament> => {
  const [tournament] = await db.insert(T_Tournament).values(input.tournament).returning();

  return tournament;
};
