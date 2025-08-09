import dayjs from 'dayjs';

const toCronFormat = (date: ReturnType<typeof dayjs>) => {
  const d = dayjs(date);
  if (!d.isValid()) {
    throw new Error('Invalid date');
  }

  // Google Cloud Scheduler uses standard cron format (5 fields)
  // minute hour day month day-of-week
  return `${d.minute()} ${d.hour()} ${d.date()} ${d.month() + 1} *`;
};

export const Utils = {
  toCronFormat,
};
