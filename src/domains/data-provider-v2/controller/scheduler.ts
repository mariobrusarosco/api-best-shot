import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { asc, eq, sql } from 'drizzle-orm';
import { Request, Response } from 'express';
dayjs.extend(utc);
dayjs.extend(isToday);

const DATA_PROVIDER_ROUNDS_URL = `${process.env.API_DOMAIN}/data-provider/tournament/[tournamentId]/round/[round]`;
const DATA_PROVIDER_STANDINGS_URL = `${process.env.API_DOMAIN}/data-provider/tournaments/[tournamentId]/standings`;
const client = new SchedulerClient({ region: 'us-east-1' });

const run = async (req: Request, res: Response) => {
  try {
    const currentDayMatches = await queryCurrentDayMatchesOnDatabase();
    const dailySchedule = mapMatchesToDailySchedule(currentDayMatches);

    dailySchedule.forEach(async schedule => {
      await scheduleTournamentStandingsUpdateCronJob(schedule);
      await scheduleTournamentRoundUpdateCronJob(schedule);
    });

    res.status(200).send(currentDayMatches);
  } catch (error: any) {
    console.error('[ERROR] - SCHEDULER - ', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const queryCurrentDayMatchesOnDatabase = async () => {
  const startOfDay = dayjs().utc().startOf('day').toDate().toISOString();
  const endOfDay = dayjs().utc().endOf('day').toDate().toISOString();

  return db
    .selectDistinct({
      tournamentId: T_Match.tournamentId,
      tournamentLabel: T_Tournament.label,
      standingsUrl: T_Tournament.standingsUrl,
      roundsUrl: T_Tournament.roundsUrl,
      match: T_Match.id,
      date: T_Match.date,
      round: T_Match.roundId,
    })
    .from(T_Match)
    .leftJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
    .where(sql`date >= ${startOfDay} AND date <= ${endOfDay}`)
    .orderBy(asc(T_Match.date));
};

const mapMatchesToDailySchedule = (
  matches: Awaited<ReturnType<typeof queryCurrentDayMatchesOnDatabase>>
) => {
  const SCHEDULES = new Map();

  matches.forEach(({ tournamentId, tournamentLabel, round, date }) => {
    const utcDate = dayjs(date).utc();
    const SCHEDULE_ID = `${tournamentLabel}_${utcDate.format('MM_DD_HH_mm_YYYY')}`;

    if (!SCHEDULES.has(SCHEDULE_ID)) {
      SCHEDULES.set(SCHEDULE_ID, {
        tournamentIdToUpdate: tournamentId,
        tournamentLabelToUpdate: tournamentLabel,
        roundToUpdate: round ?? '',
        cron: toCronFormat(utcDate),
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

  const minutes = d.minute();
  const hours = d.hour();
  const dayOfMonth = d.date();
  const month = d.month() + 1;
  const dayOfWeek = '?';
  const year = d.year();

  return `cron(${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek} ${year})`;
};

const scheduleTournamentStandingsUpdateCronJob = async (schedule: ISchedule) => {
  const standingsUrl = DATA_PROVIDER_STANDINGS_URL.replace(
    '[tournamentId]',
    schedule.tournamentIdToUpdate
  );

  const params = {
    Name: `standings_${schedule.id}`,
    ScheduleExpression: schedule.cron,
    Target: {
      Arn: 'arn:aws:lambda:us-east-1:905418297381:function:update-tournament-standings-demo',
      RoleArn:
        'arn:aws:iam::905418297381:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_b425d46da9',
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

  const params = {
    Name: `round_${schedule.id}`,
    ScheduleExpression: schedule.cron,
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

type ISchedule = {
  id: string;
  cron: string;
  tournamentIdToUpdate: string;
  tournamentLabelToUpdate: string;
  roundToUpdate: string;
};

export const SchedulerController = { run };
