import { Request } from 'express';

export type SchedulerRequest = Request<null, CreateDailySchedulesResponse>;

export type CreateDailySchedulesResponse = {
  success: boolean;
  message: string;
  schedulesCreated: number;
  schedules: SchedulerInfo[];
};

export type SchedulerInfo = {
  id: string;
  cronExpression: string;
  startDate: Date;
  targetUrls: {
    standings: string;
    round: string;
  };
};