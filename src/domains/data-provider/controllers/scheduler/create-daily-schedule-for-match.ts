import { MatchQueries } from '@/domains/match/queries';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { scheduleScoresAndStandingsRoutine } from './routines/scores-and-standings';
import { IDailySchedule, ROUND_URL, STANDINGS_URL } from './typing';
import { Utils } from './utils';

dayjs.extend(utc);

export const createDailyScoresAndStandingsRoutine = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();
  if (!currentDayMatches) {
    return new Map([
      ['standingsToUpdate', []],
      ['roundsToUpdate', []],
    ]);
  }

  const schedules = new Map<string, IDailySchedule>();

  currentDayMatches.forEach(async (match: (typeof currentDayMatches)[number]) => {
    const schedule = buildSchedule(match);

    if (!schedules.has(schedule.id)) {
      schedules.set(schedule.id, schedule);

      await scheduleScoresAndStandingsRoutine(schedule);
    }
  });

  return schedules;
};

const generateScheduleId = (
  tournamentLabel: string | null,
  estimatedEndOfMatch: dayjs.Dayjs
) => {
  const env = process.env.NODE_ENV === 'demo' ? 'demo_' : '';

  return `${env}${tournamentLabel}_${estimatedEndOfMatch.format('YYYY_MM_DD_HH_mm')}`
    .toLowerCase()
    .replace(/[\s/-]+/g, '_')
    .replace(/[^0-9a-z-_.]/g, '');
};

const buildSchedule = (
  match: Awaited<ReturnType<typeof MatchQueries.currentDayMatchesOnDatabase>>[number]
) => {
  const estimatedEndOfMatch = getEstimatedEndOfMatch();
  const scheduleId = generateScheduleId(match.tournamentLabel, estimatedEndOfMatch);
  const targetEnv = process.env.NODE_ENV;

  return {
    targetInput: {
      standingsUrl: STANDINGS_URL.replace(':tournamentId', match.tournamentId),
      roundUrl: ROUND_URL.replace(':tournamentId', match.tournamentId).replace(
        ':roundSlug',
        match.roundSlug
      ),
      targetEnv,
    },
    cronExpression: Utils.toCronFormat(estimatedEndOfMatch),
    startDate: estimatedEndOfMatch.toDate(),
    id: scheduleId,
  };
};

const getEstimatedEndOfMatch = () => {
  return dayjs().utc().add(2, 'minutes');
};
