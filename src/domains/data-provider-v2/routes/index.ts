import type { Express } from 'express';
import express from 'express';
import { TeamsDataController } from '../controller-v2/teams';
import { TournamentDataController } from '../controller-v2/tournaments';

const DataProviderRouting = (app: Express) => {
  const dataProviderRouter = express.Router();

  dataProviderRouter.post('/tournaments', TournamentDataController.setupTournament);
  dataProviderRouter.patch('/tournaments', TournamentDataController.updateTournament);

  dataProviderRouter.post('/teams', TeamsDataController.setupTeams);
  dataProviderRouter.patch('/teams', TeamsDataController.updateTeams);

  app.use(`${process.env.API_VERSION}/data-provider`, dataProviderRouter);
};

export default DataProviderRouting;
