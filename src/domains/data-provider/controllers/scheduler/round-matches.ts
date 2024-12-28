type IRoundMatchesSchedule = {
  id: string;
  cron: string;
  startDate: Date;
  tournamentIdToUpdate: string;
  roundToUpdate: string;
};

const url = `${process.env.API_DOMAIN}${process.env.API_VERSION}/data-provider/tournaments/:tournamentId/matches/:roundSlug`;
