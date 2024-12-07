import { AuthMiddleware } from '@/domains/auth/middleware';
import GuessController from '@/domains/guess/controllers/guess-controllers';
import MatchController from '@/domains/match/controllers/match-controller';
import type { Express } from 'express';
import express from 'express';
import TournamentController from '../controllers/tournament-controllers';

const TournamentRouting = (app: Express) => {
  const tournamentRouter = express.Router();

  tournamentRouter.get('/', TournamentController.getAllTournaments);
  tournamentRouter.get('/:tournamentId', TournamentController.getTournament);
  tournamentRouter.get(
    '/:tournamentId/matches/:round',
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
    TournamentController.getTournamentScore
  );

  tournamentRouter.post(
    '/:tournamentId/setup',
    AuthMiddleware,
    TournamentController.setupTournament
  );

  app.use(`${process.env.API_VERSION}/tournaments`, tournamentRouter);
};

export default TournamentRouting;
