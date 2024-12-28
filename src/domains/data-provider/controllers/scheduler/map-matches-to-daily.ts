import { MatchQueries } from '@/domains/match/queries';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export const mapMatchesToDailySchedule = (
  matches: Awaited<ReturnType<typeof MatchQueries.currentDayMatchesOnDatabase>>
) => {
  const SCHEDULES = new Map();

  matches.forEach(({ tournamentId, tournamentLabel, roundId, date }) => {
    const utcDate = dayjs(date).utc();
    const SCHEDULE_ID = `${tournamentLabel}_${utcDate.format('YYYY_MM_DD_HH_mm')}`
      .toLowerCase()
      .replace(/\s/gi, '_');

    if (!SCHEDULES.has(SCHEDULE_ID)) {
      SCHEDULES.set(SCHEDULE_ID, {
        tournamentIdToUpdate: tournamentId,
        tournamentLabelToUpdate: tournamentLabel,
        roundToUpdate: roundId ?? '',
        cron: toCronFormat(utcDate),
        startDate: utcDate.toDate(),
        id: SCHEDULE_ID,
      });
    }
  });

  return [...SCHEDULES];
};

export const toCronFormat = (date: ReturnType<typeof dayjs>) => {
  const d = dayjs(date);
  if (!d.isValid()) {
    throw new Error('Invalid date');
  }

  return `cron(${d.minute()} ${d.hour()} ${d.date()} ${
    d.month() + 1
  } ${'?'} ${d.year()})`;
};

type ISchedule = {
  id: string;
  cron: string;
  startDate: Date;
  tournamentIdToUpdate: string;
  tournamentLabelToUpdate: string;
  roundToUpdate: string;
};
