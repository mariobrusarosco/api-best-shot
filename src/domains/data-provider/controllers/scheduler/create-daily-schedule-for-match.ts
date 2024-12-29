import { MatchQueries } from '@/domains/match/queries';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { scheduleScoresAndStandingsRoutine } from './routines/scores-and-standings';
import { IDailySchedule, ROUND_URL, STANDINGS_URL } from './typing';
import { Utils } from './utils';

dayjs.extend(utc);

export const createDailyScoresAndStandingsRoutine = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();
  if (!currentDayMatches)
    return {
      standingsToUpdate: [],
      roundsToUpdate: [],
    };

  const schedules = new Map<string, IDailySchedule>();

  currentDayMatches.forEach(async match => {
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
  return `${tournamentLabel}_${estimatedEndOfMatch.format('YYYY_MM_DD_HH_mm')}`
    .toLowerCase()
    .replace(/[\s\/\-]+/g, '_');
};

const buildSchedule = (match: any) => {
  const estimatedEndOfMatch = getEstimatedEndOfMatch(match.date);
  const scheduleId = generateScheduleId(match.tournamentLabel, estimatedEndOfMatch);

  return {
    targetInput: {
      standingsUrl: STANDINGS_URL.replace(':tournamentId', match.tournamentId),
      roundUrl: ROUND_URL.replace(':tournamentId', match.tournamentId).replace(
        ':roundSlug',
        match.roundId
      ),
    },
    cronExpression: Utils.toCronFormat(estimatedEndOfMatch),
    startDate: estimatedEndOfMatch.toDate(),
    id: scheduleId,
  };
};

const getEstimatedEndOfMatch = (date: Date | null) => {
  return dayjs(date).utc().add(2, 'hours');
};
