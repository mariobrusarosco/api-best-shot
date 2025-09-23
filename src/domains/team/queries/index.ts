import db from '@/services/database';
import { T_Team, DB_InsertTeam } from '@/domains/team/schema';
import { Profiling } from '@/services/profiling';

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

      Profiling.log({
        msg: '[SofascoreTeams] - UPSERTING TEAM',
        data: team,
        source: 'TEAM_QUERIES_updateTeams',
      });
    }
    return results;
  });
};

export const QUERIES_TEAMS = {
  createTeams,
  updateTeams,
};
