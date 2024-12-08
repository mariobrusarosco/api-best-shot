import type { Express } from 'express';
import express from 'express';
import { MatchesDataController } from '../controller/matches';
import { TeamsDataController } from '../controller/teams';
import { TournamentDataController } from '../controller/tournaments';

const DataProviderRouting = (app: Express) => {
  const dataProviderRouter = express.Router();

  // TOURNAMENTS
  dataProviderRouter.post('/tournaments', TournamentDataController.setupTournament);
  dataProviderRouter.patch('/tournaments', TournamentDataController.updateTournament);
  // TEAMS
  dataProviderRouter.post('/teams', TeamsDataController.setupTeams);
  dataProviderRouter.patch('/teams', TeamsDataController.updateTeams);
  // MATCHES
  dataProviderRouter.post('/matches', MatchesDataController.setupMatches);
  dataProviderRouter.patch('/matches', MatchesDataController.updateMatches);

  app.use(`${process.env.API_VERSION}/data-provider`, dataProviderRouter);
};

export default DataProviderRouting;
