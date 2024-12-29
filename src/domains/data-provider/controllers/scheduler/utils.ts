import dayjs from 'dayjs';

const toCronFormat = (date: ReturnType<typeof dayjs>) => {
  const d = dayjs(date);
  if (!d.isValid()) {
    throw new Error('Invalid date');
  }

  return `cron(${d.minute()} ${d.hour()} ${d.date()} ${
    d.month() + 1
  } ${'?'} ${d.year()})`;
};

export const Utils = {
  toCronFormat,
};
