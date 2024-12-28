import { MatchQueries } from '@/domains/match/queries';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { DB_SelectTournament } from '@/domains/tournament/schema';
import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { Request, Response } from 'express';
dayjs.extend(utc);
dayjs.extend(isToday);

const DATA_PROVIDER_ROUNDS_URL = `${process.env.API_DOMAIN}/data-provider/tournament/[tournamentId]/round/[round]`;
const DATA_PROVIDER_STANDINGS_URL = `${process.env.API_DOMAIN}/data-provider/tournaments/[tournamentId]/standings`;
const client = new SchedulerClient({ region: 'us-east-1' });

const run = async (req: Request, res: Response) => {
  try {
    const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();

    const dailySchedule = mapMatchesToDailySchedule(currentDayMatches);

    dailySchedule.forEach(async schedule => {
      // await scheduleTournamentStandingsUpdateCronJob(schedule);
      await scheduleTournamentRoundUpdateCronJob(schedule);
    });

    res.status(200).send(currentDayMatches);
  } catch (error: any) {
    console.error('[ERROR] - SCHEDULER - ', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const mapMatchesToDailySchedule = (
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

  return SCHEDULES;
};

const toCronFormat = (date: ReturnType<typeof dayjs>) => {
  const d = dayjs(date);
  if (!d.isValid()) {
    throw new Error('Invalid date');
  }

  return `cron(${d.minute()} ${d.hour()} ${d.date()} ${
    d.month() + 1
  } ${'?'} ${d.year()})`;
};

const scheduleTournamentStandingsUpdateCronJob = async (
  tournament: DB_SelectTournament
) => {
  const startDate = dayjs().add(1, 'minute');
  const endDate = startDate.add(1, 'day');
  const SCHEDULE_ID = `${tournament.label}_${startDate.format('YYYY_MM_DD_HH_mm')}`
    .toLowerCase()
    .replace(/\s/gi, '');

  const schedule = {
    id: SCHEDULE_ID,
    cron: 'rate(2 minutes)',
    startDate: new Date(),
    tournamentIdToUpdate: tournament.id,
    tournamentLabelToUpdate: tournament.label,
    roundToUpdate: '',
  } as ISchedule;

  const standingsUrl = DATA_PROVIDER_STANDINGS_URL.replace(
    '[tournamentId]',
    tournament.id!
  );

  const params = {
    Name: `standings_${schedule.id}`,
    ScheduleExpression: 'rate(2 minutes)',
    ScheduleExpressionTimezone: 'America/Sao_Paulo',
    StartDate: startDate.toDate(),
    EndDate: endDate.toDate(),
    Target: {
      Arn: 'arn:aws:lambda:us-east-1:905418297381:function:update-tournament-standings-demo',
      RoleArn:
        'arn:aws:iam::905418297381:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_d1e4620a00',
      Input: JSON.stringify({ standingsUrl }),
    },
    State: 'ENABLED' as const, // Schedule state: 'ENABLED' or 'DISABLED',
    FlexibleTimeWindow: {
      Mode: 'OFF' as const,
    },
    ActionAfterCompletion: undefined,
    GroupName: 'tournament-standings',
  };

  const command = new CreateScheduleCommand(params);
  const response = await client.send(command);
  console.log(`Schedule created: ${response.ScheduleArn}`);
};

const scheduleTournamentRoundUpdateCronJob = async (schedule: ISchedule) => {
  const roundsUrl = DATA_PROVIDER_ROUNDS_URL.replace(
    '[tournamentId]',
    schedule.tournamentIdToUpdate
  ).replace('[round]', schedule.roundToUpdate);

  console.log({ roundsUrl });
  const params = {
    Name: `round_${schedule.id}`,
    ScheduleExpression: schedule.cron,
    StartDate: schedule.startDate,
    Target: {
      Arn: 'arn:aws:lambda:us-east-1:905418297381:function:update-tournament-round-demo',
      RoleArn:
        'arn:aws:iam::905418297381:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_b425d46da9',
      Input: JSON.stringify({ roundsUrl }),
    },
    State: 'ENABLED' as const,
    FlexibleTimeWindow: {
      Mode: 'OFF' as const,
    },
    ActionAfterCompletion: undefined,
    GroupName: 'tournament-round',
  };

  const command = new CreateScheduleCommand(params);
  const response = await client.send(command);
  console.log(`Schedule created: ${response.ScheduleArn}`);
};

const tournamentUpdateRecurrence = async (tournament: DB_SelectTournament) => {
  if (tournament.mode === 'regular-season-only') {
    return null;
  }

  const startDate = dayjs().add(1, 'minute');
  const endDate = startDate.add(1, 'day');
  const apiUrl = `${process.env.API_DOMAIN}/data-provider/tournaments/${tournament.id}/rounds`;

  const params = {
    Name: `tournament-round-update-${tournament.label.replace(/\s/gi, '-')}`,
    ScheduleExpression: 'rate(2 minutes)',
    ScheduleExpressionTimezone: 'America/Sao_Paulo',
    StartDate: startDate.toDate(),
    EndDate: endDate.toDate(),
    Target: {
      Arn: 'arn:aws:lambda:us-east-1:905418297381:function:tournament-rounds-checker-demo',
      RoleArn:
        'arn:aws:iam::905418297381:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_b425d46da9',
      Input: JSON.stringify({ apiUrl }),
    },
    FlexibleTimeWindow: {
      Mode: 'OFF' as const,
    },
    ActionAfterCompletion: undefined,
    GroupName: 'tournament-rounds-checker',
  };

  const command = new CreateScheduleCommand(params);
  const response = await client.send(command);

  return response.ScheduleArn;
};

type ISchedule = {
  id: string;
  cron: string;
  startDate: Date;
  tournamentIdToUpdate: string;
  tournamentLabelToUpdate: string;
  roundToUpdate: string;
};

export const Scheduler = {
  run,
  tournamentUpdateRecurrence,
  scheduleTournamentStandingsUpdateCronJob,
};
