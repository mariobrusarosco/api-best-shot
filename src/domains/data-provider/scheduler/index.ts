import { TournamentQuery } from '@/domains/tournament/queries';
import { createSchedule } from './create-schedule';

const dailyStandingsChecker = async (tournament: TournamentQuery) => {
  if (!tournament) return 'No given tournament to schedule';

  const url = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/${tournament?.id}/standings`;
  const groupName = 'standings-checker';

  return createSchedule({
    targetInput: { url },
    tournament,
    groupName,
  });
};

const dailyNewRoundsChecker = async (tournament: TournamentQuery) => {
  if (!tournament) return 'No given tournament to schedule';

  const url = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/${tournament?.id}/rounds`;
  const groupName = 'rounds-checker';

  return createSchedule({
    targetInput: { url },
    tournament,
    groupName,
  });
};

export const BestshotScheduler = {
  dailyStandingsChecker,
  dailyNewRoundsChecker,
};
