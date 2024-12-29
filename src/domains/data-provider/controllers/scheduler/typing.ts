export type IDailySchedule = {
  id: string;
  cronExpression: string;
  startDate: Date;
  targetInput: any;
};

export const STANDINGS_URL = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/:tournamentId/standings`;
export const ROUND_URL = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/:tournamentId/matches/:roundSlug`;
export const ROUNDS_URL = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/:tournamentId/rounds`;
export const KNOCKOUT_ROUNDS_UPDATE_URL = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/:tournamentId/rounds/knockout-update`;
