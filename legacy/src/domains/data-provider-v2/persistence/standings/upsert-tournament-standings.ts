import type {
  MappedTournamentStandingsRowInput,
  StandingsUpdateDetail,
} from '@/domains/data-provider-v2/contracts/standings';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';

export const upsertTournamentStandings = async (input: {
  rows: MappedTournamentStandingsRowInput[];
}): Promise<StandingsUpdateDetail[]> => {
  if (input.rows.length === 0) {
    return [];
  }

  const updatedRows = await QUERIES_TOURNAMENT.upsertTournamentStandings(input.rows);

  return updatedRows.map(row => ({
    teamId: row.teamId,
    teamExternalId: row.teamExternalId,
    teamName: row.longName,
    shortName: row.shortName,
    groupName: row.groupName ?? '',
    order: row.order,
    reason: 'updated',
  }));
};
