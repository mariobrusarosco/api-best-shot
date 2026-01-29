import { MatchQueries } from '@/domains/match/queries';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';

const getDashboard = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();

  Logger.info(`[Current day matches: ${currentDayMatches.length}]`, {
    domain: DOMAINS.DASHBOARD,
    component: 'service',
    currentDayMatches,
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
