import { QUERIES_MATCH } from '@/domains/match/queries';
import Profiling from '@/services/profiling';

const getDashboard = async () => {
  const currentDayMatches = await QUERIES_MATCH.currentDayMatches();

  Profiling.log({
    msg: `[Current day matches: ${currentDayMatches.length}]`,
    data: { currentDayMatches },
  });

  const uniqueMatches = new Map();

  currentDayMatches.forEach(match => {
    uniqueMatches.set(`${match.tournamentId}_${match.roundSlug}`, match);
  });

  return {
    matchday: {
      all: [...uniqueMatches].map(([, match]) => match),
    },
  };
};

export const SERVICES_DASHBOARD = {
  getDashboard,
};
