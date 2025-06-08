import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const defineTimebox = (matchDate: string) => dayjs(matchDate).fromNow();
