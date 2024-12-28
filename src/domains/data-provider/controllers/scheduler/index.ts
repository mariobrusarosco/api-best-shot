import { MatchQueries } from '@/domains/match/queries';
import { TournamentQuery } from '@/domains/tournament/queries';
import { IDailySchedule, ROUND_URL, STANDINGS_URL } from '../../api/scheduler/typing';
import { createCustomSchedule, createSchedule } from './create-schedule';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { toCronFormat } from './map-matches-to-daily';
dayjs.extend(utc);

const dailyStandingsChecker = async (tournament: TournamentQuery) => {
  if (!tournament) return 'No given tournament to schedule';

  const url = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/${tournament?.id}/standings`;
  const groupName = 'standings-checker';

  return createSchedule({
    targetInput: { url },
    tournament,
    groupName,
  });
};

const dailyNewRoundsChecker = async (tournament: TournamentQuery) => {
  if (!tournament) return 'No given tournament to schedule';
  const url = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournament/${tournament?.id}/round/[round]`;

  const groupName = 'rounds-checker';

  return createSchedule({
    targetInput: { url },
    tournament,
    groupName,
  });
};

const dailyScoresAndStandingsRoutine = async () => {
  const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();
  if (!currentDayMatches)
    return {
      standingsToUpdate: [],
      roundsToUpdate: [],
    };

  const SCHEDULES = new Map<string, IDailySchedule>();

  currentDayMatches.forEach(match => {
    const utcDate = dayjs(match.date).utc();
    const SCHEDULE_ID = `${match.tournamentLabel}_${utcDate.format('YYYY_MM_DD_HH_mm')}`
      .toLowerCase()
      .replace(/[\s\/\-]+/g, '_');

    if (!SCHEDULES.has(SCHEDULE_ID)) {
      SCHEDULES.set(SCHEDULE_ID, {
        targetInput: {
          standingsUrl: STANDINGS_URL.replace(':tournamentId', match.tournamentId),
          roundUrl: ROUND_URL.replace(':tournamentId', match.tournamentId).replace(
            ':roundSlug',
            match.roundId
          ),
        },
        cronExpression: toCronFormat(utcDate),
        startDate: utcDate.toDate(),
        id: SCHEDULE_ID,
      });
    }
  });

  SCHEDULES.forEach(async schedule => {
    await createCustomSchedule({
      ...schedule,
      groupName: 'scores-and-standings-routine',
      targetArn: 'arn:aws:lambda:us-east-1:905418297381:function:scheduler-caller-demo',
    });
  });

  return 'OK';
};

export const SchedulerController = {
  dailyStandingsChecker,
  dailyNewRoundsChecker,
  dailyScoresAndStandingsRoutine,
};
