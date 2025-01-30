import express from 'express';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';
import { PerformanceController } from '@/domains/performance/controller';
import LeagueController from '../controllers/league-controller';
import { API_LEAGUE } from '../api';
import { SERVICES_PERFORMANCE_V2 } from '@/domains/performance/services';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);
RouterV1.post('/', LeagueController.createLeague);
RouterV1.get('/', LeagueController.getLeagues);
RouterV1.post('/invitation', LeagueController.inviteToLeague);
RouterV1.get('/:leagueId', LeagueController.getLeague);
RouterV1.patch('/:leagueId/tournaments', LeagueController.updateLeagueTournaments);
RouterV1.get('/:leagueId/performance', PerformanceController.getLeaguePerformance);
RouterV1.patch('/:leagueId/performance', PerformanceController.updateLeaguePerformance);

ApplicationRouter.register("api/v1/leagues", RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);
RouterV2.post('/', LeagueController.createLeague);
RouterV2.get('/', LeagueController.getLeagues);
RouterV2.post('/invitation', LeagueController.inviteToLeague);
RouterV2.get('/:leagueId', LeagueController.getLeague);
RouterV2.patch('/:leagueId/tournaments', LeagueController.updateLeagueTournaments);
RouterV2.get('/:leagueId/performance',  API_LEAGUE.updateLeaguePerformance);
RouterV2.patch('/:leagueId/performance', API_LEAGUE.updateLeaguePerformance);

ApplicationRouter.register("api/v2/leagues", RouterV2);
