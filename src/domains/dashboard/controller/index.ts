import { MatchQueries } from '@/domains/match/queries';

const getDashboard = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();
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

export const DashboardController = {
  getDashboard,
};
