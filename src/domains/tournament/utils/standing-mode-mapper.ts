import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import type { ITournamentStadingsMode } from '@/domains/tournament/typing';

export const parseStandingsByMode = async (
  standings: Awaited<ReturnType<typeof QUERIES_TOURNAMENT.getTournamentStandings>>,
  standingsMode: ITournamentStadingsMode
) => {
  if (standings === null) {
    return {
      teams: [],
      format: standingsMode,
      lastUpdated: [],
    };
  }

  switch (standingsMode) {
    case 'unique-group':
      return {
        teams: standings,
        format: standingsMode,
        lastUpdated: [],
      };
    case 'multi-group': {
      const groups = new Map();

      standings.forEach(standing => {
        if (!groups.has(standing.groupName)) {
          groups.set(standing.groupName, []);
        }
        groups.get(standing.groupName)?.push(standing);
      });

      return {
        teams: Array.from(groups).map(([group, teams]) => ({ name: group, teams })),
        format: standingsMode,
        lastUpdated: [],
      };
    }
    default:
      return {
        teams: [],
        format: standingsMode,
        lastUpdated: [],
      };
  }
};
