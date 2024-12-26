import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_Teams } from '@/domains/data-provider/api/teams';
import { API_Tournament } from '@/domains/data-provider/api/tournament';
import { API_TournamentRounds } from '@/domains/data-provider/api/tournament-round';
import type { Express } from 'express';
import express from 'express';

const DataProviderRouting = (app: Express) => {
  const dataProviderRouter = express.Router();

  // TOURNAMENTS
  dataProviderRouter.post('/tournaments', API_Tournament.setup);
  dataProviderRouter.patch('/tournaments/:tournamentId', API_Tournament.update);

  // TOURNAMENT ROUNDS
  dataProviderRouter.post(
    '/tournaments/:tournamentId/rounds',
    API_TournamentRounds.createRounds
  );
  dataProviderRouter.patch(
    '/tournaments/:tournamentId/rounds',
    API_TournamentRounds.updateRounds
  );

  // TEAMS
  dataProviderRouter.post('/tournaments/:tournamentId/teams', API_Teams.createTeams);
  dataProviderRouter.patch('/tournaments/:tournamentId/teams', API_Teams.updateTeams);
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
