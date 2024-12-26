import { AuthMiddleware } from '@/domains/auth/middleware';
import type { Express } from 'express';
import express from 'express';
import { API_Tournament } from '../../data-provider/api/tournament';

const DataProviderRouting = (app: Express) => {
  const dataProviderRouter = express.Router();

  // TOURNAMENTS
  dataProviderRouter.post('/tournaments', API_Tournament.setup);
  dataProviderRouter.patch('/tournaments/:tournamentId/test', API_Tournament.update);

  // TEAMS
  // dataProviderRouter.post(
  //   '/tournaments/:tournamentId/teams',
  //   TeamsDataController.setupTeams
  // );
  // dataProviderRouter.patch(
  //   '/tournaments/:tournamentId/teams',
  //   TeamsDataController.updateTeams
  // );
  // // MATCHES
  // dataProviderRouter.post(
  //   '/tournaments/:tournamentId/matches',
  //   MatchesDataController.setupMatches
  // );
  // dataProviderRouter.patch(
  //   '/tournaments/:tournamentId/matches/:roundId',
  //   API_MatchesDataprovider.updateScoresOfRound
  // );

  // STANDINGS
  // dataProviderRouter.post(
  //   '/tournaments/:tournamentId/standings',
  //   StandingsDataController.setupStandings
  // );
  // dataProviderRouter.patch(
  //   '/tournaments/:tournamentId/standings',
  //   API_StandingsDataprovider.update
  // );

  // SCHEDULER
  // dataProviderRouter.post('/scheduler', Scheduler.run);
  app.use(`${process.env.API_VERSION}/data-provider`, AuthMiddleware, dataProviderRouter);
};

export default DataProviderRouting;
