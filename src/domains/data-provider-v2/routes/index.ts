import { AuthMiddleware } from '@/domains/auth/middleware';
import type { Express } from 'express';
import express from 'express';
import { MatchesDataController } from '../controller/matches';
import { SchedulerController } from '../controller/scheduler';
import { StandingsDataController } from '../controller/standings';
import { TeamsDataController } from '../controller/teams';
import { TournamentDataController } from '../controller/tournaments';

const DataProviderRouting = (app: Express) => {
  const dataProviderRouter = express.Router();

  // TOURNAMENTS
  dataProviderRouter.post('/tournaments', TournamentDataController.setupTournament);
  dataProviderRouter.patch('/tournaments', TournamentDataController.updateTournament);
  // TEAMS
  // dataProviderRouter.post(
  //   '/tournaments/:tournamentId/teams',
  //   TeamsDataController.setupTeams
  // );
  dataProviderRouter.patch(
    '/tournaments/:tournamentId/teams',
    TeamsDataController.updateTeams
  );
  // MATCHES
  dataProviderRouter.post(
    '/tournaments/:tournamentId/matches',
    MatchesDataController.setupMatches
  );
  dataProviderRouter.patch(
    '/tournaments/:tournamentId/round/:roundId',
    MatchesDataController.updateMatches
  );

  // STANDINGS
  dataProviderRouter.post(
    '/tournaments/:tournamentId/standings',
    StandingsDataController.setupStandings
  );
  dataProviderRouter.patch(
    '/tournaments/:tournamentId/standings',
    StandingsDataController.updateStandings
  );

  // SCHEDULER
  dataProviderRouter.post('/scheduler', SchedulerController.run);
  app.use(`${process.env.API_VERSION}/data-provider`, AuthMiddleware, dataProviderRouter);
};

export default DataProviderRouting;
