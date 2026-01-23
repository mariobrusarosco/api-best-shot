import { T_Guess } from '@/domains/guess/schema';
import { T_League, T_LeagueRole, T_LeagueTournament } from '@/domains/league/schema';

import db from '@/services/database';

/**
 * Service for administrative maintenance tasks
 */
export const MaintenanceService = {
  /**
   * Resets all user-generated activity (guesses, leagues, performances)
   * while preserving user accounts and tournament data.
   *
   * @returns Promise<void>
   */
  resetUserActivity: async (): Promise<void> => {
    await db.transaction(async tx => {
      // 1. Delete Performances (Leaf nodes, depend on members/leagues/tournaments)

      // 2. Delete Guesses (Depends on matches/members)
      await tx.delete(T_Guess);

      // 3. Delete League Data (Depends on members)
      // Delete in order of dependency: LeagueTournament -> LeagueRole -> League
      await tx.delete(T_LeagueTournament);
      await tx.delete(T_LeagueRole);
      await tx.delete(T_League);
    });
  },
};
