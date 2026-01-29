import db from '@/services/database';
import { T_Team, DB_InsertTeam } from '@/domains/team/schema';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';

const createTeams = async (teams: DB_InsertTeam[]) => {
  return await db.insert(T_Team).values(teams).onConflictDoNothing().returning();
};

const updateTeams = async (teams: DB_InsertTeam[]) => {
  console.log('[LOG] - [START] - UPSERTING TEAMS ON DATABASE');

  return await db.transaction(async tx => {
    const results = [];
    for (const team of teams) {
      const result = await tx
        .insert(T_Team)
        .values(team)
        .onConflictDoUpdate({
          target: [T_Team.externalId, T_Team.provider],
          set: {
            ...team,
          },
        })
        .returning();

      results.push(result[0]);

      Logger.info('[SofascoreTeams] - UPSERTING TEAM', {
        domain: DOMAINS.TEAM,
        component: 'database',
        team,
      });
    }
    return results;
  });
};

export const QUERIES_TEAMS = {
  createTeams,
  updateTeams,
};
