import { QUERIES_MATCH } from '@/domains/match/queries';

const getDashboard = async () => {
  const currentDayMatches = await QUERIES_MATCH.currentDayMatches();
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
