export type IDailySchedule = {
  id: string;
  cronExpression: string;
  startDate: Date;
  targetInput: Record<string, unknown>;
};

import { env } from '@/config/env';

export const STANDINGS_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/tournaments/:tournamentId/standings`;
export const ROUND_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/tournaments/:tournamentId/matches/:roundSlug`;
export const ROUNDS_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/tournaments/:tournamentId/rounds`;
export const KNOCKOUT_ROUNDS_UPDATE_URL = `${env.API_DOMAIN}${env.API_VERSION}/data-provider/tournaments/:tournamentId/rounds/knockout-update`;
