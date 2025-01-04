import { TournamentQuery } from '@/domains/tournament/queries';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { scheduleKnockoutsUpdateRoutine } from './routines/knockouts-update';
import { KNOCKOUT_ROUNDS_UPDATE_URL } from './typing';

dayjs.extend(utc);

export const createKnockoutsUpdatesRoutine = async (tournament: TournamentQuery) => {
  if (!tournament) return 'No given tournament to schedule';

  const schedule = buildSchedule(tournament);
  await scheduleKnockoutsUpdateRoutine(schedule);

  return schedule;
};

const generateScheduleId = (tournamentLabel: string | null) => {
  const env = process.env.NODE_ENV === 'demo' ? '_demo' : '';

  return `${env}${tournamentLabel}_knockouts_update`.replace(/[\s\/\-]+/g, '_');
};

const buildSchedule = (tournament: any) => {
  const scheduleId = generateScheduleId(tournament.label);

  return {
    targetInput: {
      knockoutsUpdateUrl: KNOCKOUT_ROUNDS_UPDATE_URL.replace(
        ':tournamentId',
        tournament.id
      ),
    },
    id: scheduleId,
  };
};
