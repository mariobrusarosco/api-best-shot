import type { Express } from 'express';
import express from 'express';
import { ControllerTeamsProvider } from '../controller-v2/teams';
import { TournamentProviderController } from '../controller-v2/tournaments';

const DataProviderRouting = (app: Express) => {
  const dataProviderRouter = express.Router();

  dataProviderRouter.post('/tournaments', TournamentProviderController.setupTournament);
  dataProviderRouter.patch('/tournaments', TournamentProviderController.updateTournament);

  dataProviderRouter.post('/teams', ControllerTeamsProvider.setupTeams);
  // dataProviderRouter.patch('/teams', ControllerTeamsProvider.updateTeams);

  app.use(`${process.env.API_VERSION}/data-provider`, dataProviderRouter);
};

export default DataProviderRouting;
