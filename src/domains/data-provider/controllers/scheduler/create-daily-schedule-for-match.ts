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
  matchDate: Date | null,
  estimatedEndOfMatch: dayjs.Dayjs
) => {
  const env = process.env.NODE_ENV === 'demo' ? 'demo_' : '';

  // Use match date for schedule ID, not execution date
  // This ensures schedules for matches on the same day have consistent naming
  const scheduleDate = matchDate ? dayjs(matchDate).utc() : dayjs().utc();
  const executionTime = estimatedEndOfMatch.format('HH_mm');

  return `${env}${tournamentLabel}_${scheduleDate.format('YYYY_MM_DD')}_${executionTime}`
    .toLowerCase()
    .replace(/[\s/-]+/g, '_')
    .replace(/[^0-9a-z-_.]/g, '');
};

const buildSchedule = (match: Awaited<ReturnType<typeof MatchQueries.currentDayMatchesOnDatabase>>[number]) => {
  const estimatedEndOfMatch = getEstimatedEndOfMatch(match.date);
  const scheduleId = generateScheduleId(match.tournamentLabel, match.date, estimatedEndOfMatch);
  const targetEnv = process.env.NODE_ENV;

  return {
    targetInput: {
      standingsUrl: STANDINGS_URL,
      roundUrl: ROUND_URL,
      tournamentId: match.tournamentId,
      roundSlug: match.roundSlug,
      targetEnv,
    },
    cronExpression: Utils.toCronFormat(estimatedEndOfMatch),
    startDate: estimatedEndOfMatch.toDate(),
    id: scheduleId,
  };
};

const getEstimatedEndOfMatch = (matchDate: Date | null) => {
  if (!matchDate) {
    // Fallback: schedule for 3 hours from now if no match date
    return dayjs().utc().add(3, 'hours');
  }

  // Schedule 2.5 hours after the match starts for realistic timing
  // Match duration: 45min + 10min added + 15min halftime + 45min + 10min added + 10min buffer = 135min
  // Total: 2.5 hours covers the longest possible match plus buffer
  return dayjs(matchDate).utc().add(2.5, 'hours');
};
