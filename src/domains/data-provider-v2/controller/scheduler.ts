import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import {
  EventBridgeClient,
  PutRuleCommand,
  PutRuleCommandInput,
  PutTargetsCommand,
  PutTargetsCommandInput,
} from '@aws-sdk/client-eventbridge';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { asc, eq, sql } from 'drizzle-orm';
import { Request, Response } from 'express';

const client = new EventBridgeClient({ region: 'us-east-1' });
const DATA_PROVIDER_ROUNDS_URL = `${process.env.API_DOMAIN}/data-provider/tournament/[tournamentId]/round/[round]`;
const DATA_PROVIDER_STANDINGS_URL = `${process.env.API_DOMAIN}/data-provider/tournaments/[tournamentId]/standings`;

dayjs.extend(utc);
dayjs.extend(isToday);

const run = async (req: Request, res: Response) => {
  try {
    const currentDayMatches = await queryCurrentDayMatchesOnDatabase();
    const dailySchedule = mapMatchesToDailySchedule(currentDayMatches);

    dailySchedule.forEach(async schedule => {
      await scheduleMatchScoreUpdateCronJob(schedule);
    });

    res.status(200).send(currentDayMatches);
  } catch (error: any) {
    console.error('[ERROR] - SCHEDULER - ', error);

    handleInternalServerErrorResponse(res, error);
  }
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
    const SCHEDULE_ID = `tourn_${tournamentLabel}_round_${round}_${utcDate.format(
      'MM_DD_HH_mm_YYYY'
    )}`;

    if (!SCHEDULES.has(SCHEDULE_ID)) {
      SCHEDULES.set(SCHEDULE_ID, {
        tournamentIdToUpdate: tournamentId,
        roundToUpdate: round ?? '',
        cron: toCronFormat(utcDate),
        id: SCHEDULE_ID,
      });
    }
  });

  return SCHEDULES;
};

const scheduleMatchScoreUpdateCronJob = async (schedule: ISchedule) => {
  const ruleName = schedule.id;

  const rule = {
    Name: ruleName,
    ScheduleExpression: schedule.cron,
  } as PutRuleCommandInput;

  const roundsUrl = DATA_PROVIDER_ROUNDS_URL.replace(
    '[tournamentId]',
    schedule.tournamentIdToUpdate
  ).replace('[round]', schedule.roundToUpdate);
  const standingsUrl = DATA_PROVIDER_STANDINGS_URL.replace(
    '[tournamentId]',
    schedule.tournamentIdToUpdate
  );
  const ruleTarget = {
    Rule: ruleName,
    Targets: [
      {
        Id: ruleName,
        Arn: 'arn:aws:lambda:us-east-1:905418297381:function:match-score-update',
        Input: JSON.stringify({
          roundsUrl,
          standingsUrl,
        }),
      },
    ],
  } as PutTargetsCommandInput;

  await client.send(new PutRuleCommand(rule));
  console.log(`Rule created: ${ruleName}`);

  await client.send(new PutTargetsCommand(ruleTarget));
  console.log(`Target attached to rule: ${ruleName}`);
};

type IDailySchedule = ISchedule[];
type ISchedule = {
  id: string;
  cron: string;
  tournamentIdToUpdate: string;
  roundToUpdate: string;
};

export const SchedulerController = { run };
