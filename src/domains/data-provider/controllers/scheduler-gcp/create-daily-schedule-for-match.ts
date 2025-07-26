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
  const env = process.env.NODE_ENV === 'demo' ? 'demo-' : '';

  return `${env}${tournamentLabel}-${estimatedEndOfMatch.format('YYYY-MM-DD-HH-mm')}`
    .toLowerCase()
    .replace(/[\s/_]+/g, '-');
};

const buildSchedule = (
  match: Awaited<ReturnType<typeof MatchQueries.currentDayMatchesOnDatabase>>[number]
) => {
  const estimatedEndOfMatch = getEstimatedEndOfMatch(match.date);
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

const getEstimatedEndOfMatch = (date: Date | null) => {
  return dayjs(date).utc().add(2, 'hours').add(30, 'minutes');
};