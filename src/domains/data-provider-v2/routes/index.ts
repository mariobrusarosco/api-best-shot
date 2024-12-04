import { TournamentControllerv2 } from '@/domains/tournament/controller-v2';
import type { Express } from 'express';
import express from 'express';

const DataProviderRouting = (app: Express) => {
  const dataProviderRouter = express.Router();

  dataProviderRouter.post('/tournaments', TournamentControllerv2.createTournament);

  app.use(`${process.env.API_VERSION}/data-provider`, dataProviderRouter);
};

export default DataProviderRouting;
