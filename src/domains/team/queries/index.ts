import db from '@/services/database';
import { T_Team, DB_InsertTeam } from '@/domains/team/schema';
import { Profiling } from '@/services/profiling';

const createTeams = async (teams: DB_InsertTeam[]) => {
  return await db.insert(T_Team).values(teams).onConflictDoNothing().returning();
};

const updateTeams = async (teams: DB_InsertTeam[]) => {
  console.log('[LOG] - [START] - UPSERTING TEAMS ON DATABASE');

  await db.transaction(async tx => {
    for (const team of teams) {
      await tx
        .insert(T_Team)
        .values(team)
        .onConflictDoUpdate({
          target: [T_Team.externalId, T_Team.provider],
          set: {
            ...team,
          },
        });

      Profiling.log({
        msg: '[SofascoreTeams] - UPSERTING TEAM',
        data: team,
        source: 'TEAM_QUERIES_updateTeams',
      });
    }
  });
};

export const QUERIES_TEAMS = {
  createTeams,
  updateTeams,
};
