import { MatchQueries } from '@/domains/match/queries';

const getDashboard = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();
  const uniqueMatches = new Map();

  currentDayMatches.forEach(match => {
    uniqueMatches.set(`${match.tournamentId}_${match.roundId}`, match);
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
