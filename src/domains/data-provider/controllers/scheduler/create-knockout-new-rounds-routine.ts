import { TournamentQuery } from '@/domains/tournament/queries';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { scheduleNewRoundsAndMatchesRoutine } from './routines/new-rounds-and-matches';
import { ROUNDS_URL } from './typing';

dayjs.extend(utc);

export const createKnockoutNewRoundsRoutine = async (tournament: TournamentQuery) => {
  if (!tournament) return 'No given tournament to schedule';

  const schedule = buildSchedule(tournament);
  await scheduleNewRoundsAndMatchesRoutine(schedule);

  return schedule;
};

const generateScheduleId = (tournamentLabel: string | null) => {
  return `${tournamentLabel}_new_rounds_and_macthes`.replace(/[\s\/\-]+/g, '_');
};

const buildSchedule = (tournament: any) => {
  const scheduleId = generateScheduleId(tournament.label);

  return {
    targetInput: {
      kni: ROUNDS_URL.replace(':tournamentId', tournament.id),
    },
    id: scheduleId,
  };
};
