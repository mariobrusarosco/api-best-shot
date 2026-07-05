import db from '@/core/database';
import type {
  MappedTournamentStandingsRowInput,
  StandingsCreateDetail,
} from '@/domains/data-provider-v2/contracts/standings';
import { T_TournamentStandings } from '@/domains/tournament/schema';

export const insertTournamentStandings = async (input: {
  rows: MappedTournamentStandingsRowInput[];
}): Promise<StandingsCreateDetail[]> => {
  if (input.rows.length === 0) {
    return [];
  }

  const insertedRows = await db.insert(T_TournamentStandings).values(input.rows).returning();

  return insertedRows.map(row => ({
    teamId: row.teamId,
    teamExternalId: row.teamExternalId,
    teamName: row.longName,
    shortName: row.shortName,
    groupName: row.groupName ?? '',
    order: row.order,
    reason: 'created',
  }));
};
