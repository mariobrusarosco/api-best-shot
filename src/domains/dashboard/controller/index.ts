import { MatchQueries } from '@/domains/match/queries';

const getDashboard = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();

  return {
    matchday: {
      all: currentDayMatches,
    },
  };
};

export const DashboardController = {
  getDashboard,
};
