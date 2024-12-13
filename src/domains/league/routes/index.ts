import { AuthMiddleware } from '@/domains/auth/middleware';
import { PerformanceController } from '@/domains/performance/controller';
import type { Express } from 'express';
import express from 'express';
import LeagueController from '../controllers/league-controller';

const LeagueRouting = (app: Express) => {
  const leagueRouter = express.Router();

  leagueRouter.post('/', LeagueController.createLeague);
  leagueRouter.get('/', LeagueController.getLeagues);
  leagueRouter.post('/invitation', LeagueController.inviteToLeague);

  leagueRouter.get('/:leagueId', LeagueController.getLeague);
  leagueRouter.patch('/:leagueId/tournaments', LeagueController.updateLeagueTournaments);

  leagueRouter.get('/:leagueId/performance', PerformanceController.getLeaguePerformance);
  leagueRouter.patch(
    '/:leagueId/performance',
    PerformanceController.updateLeaguePerformance
  );

  app.use(`${process.env.API_VERSION}/leagues`, AuthMiddleware, leagueRouter);
};

export default LeagueRouting;
