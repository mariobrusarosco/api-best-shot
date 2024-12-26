import { AuthMiddleware } from '@/domains/auth/middleware';
import GuessController from '@/domains/guess/controllers/guess-controllers';
import MatchController from '@/domains/match/controllers/match-controller';
import { PerformanceController } from '@/domains/performance/controller';
import type { Express } from 'express';
import express from 'express';
import { API_Tournament } from '../api';
import TournamentController from '../controllers/tournament-controllers';

const TournamentRouting = (app: Express) => {
  const tournamentRouter = express.Router();

  tournamentRouter.get('/', API_Tournament.getAllTournaments);
  tournamentRouter.get('/:tournamentId', API_Tournament.getTournament);
  tournamentRouter.get(
    '/:tournamentId/matches/:roundId',
    MatchController.getMatchesByTournament
  );
  tournamentRouter.get(
    '/:tournamentId/guess',
    AuthMiddleware,
    GuessController.getMemberGuesses
  );
  tournamentRouter.get(
    '/:tournamentId/score',
    AuthMiddleware,
    TournamentController.getTournamentScore
  );
  tournamentRouter.get(
    '/:tournamentId/performance',
    AuthMiddleware,
    API_Tournament.getTournamentPerformanceForMember
  );
  tournamentRouter.patch(
    '/:tournamentId/performance',
    AuthMiddleware,
    PerformanceController.updateTournamentPerformance
  );

  tournamentRouter.get(
    '/:tournamentId/standings',
    AuthMiddleware,
    API_Tournament.getTournamentStandings
  );

  tournamentRouter.post(
    '/:tournamentId/setup',
    AuthMiddleware,
    TournamentController.setupTournament
  );

  app.use(`${process.env.API_VERSION}/tournaments`, tournamentRouter);
};

export default TournamentRouting;
