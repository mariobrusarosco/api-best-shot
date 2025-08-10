export type IDailySchedule = {
  id: string;
  cronExpression: string;
  startDate: Date;
  targetInput: Record<string, unknown>;
};

import { env } from '@/config/env';

export const STANDINGS_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/standings`;
export const ROUND_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/matches`;
export const ROUNDS_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/rounds`;
export const KNOCKOUT_ROUNDS_UPDATE_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/rounds/knockout-update`;
