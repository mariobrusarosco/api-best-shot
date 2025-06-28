import { MatchQueries } from '@/domains/match/queries';
import Profiling from '@/services/profiling';

const getDashboard = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();

  Profiling.log({
    msg: `[Current day matches: ${currentDayMatches.length}]`,
    data: { currentDayMatches },
  });

  const uniqueMatches = new Map();

  currentDayMatches.forEach((match: (typeof currentDayMatches)[number]) => {
    uniqueMatches.set(`${match.tournamentId}_${match.roundSlug}`, match);
  });

  return {
    matchday: {
      all: [...uniqueMatches].map(([, match]) => match),
    },
  };
};

export const DashboardService = {
  getDashboard,
};
