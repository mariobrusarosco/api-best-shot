import express from 'express';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_LEAGUE } from '../api';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);
RouterV1.post('/', API_LEAGUE.createLeague);
RouterV1.get('/', API_LEAGUE.getLeagues);
RouterV1.post('/invitation', API_LEAGUE.inviteToLeague);
RouterV1.get('/:leagueId', API_LEAGUE.getLeague);
RouterV1.patch('/:leagueId/tournaments', API_LEAGUE.updateLeagueTournaments);
RouterV1.get('/:leagueId/performance', API_LEAGUE.getLeagueStandings);
RouterV1.patch('/:leagueId/performance', API_LEAGUE.updateLeaguePerformance);

ApplicationRouter.register('api/v1/leagues', RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);
RouterV2.post('/', API_LEAGUE.createLeague);
RouterV2.get('/', API_LEAGUE.getLeagues);
RouterV2.post('/invitation', API_LEAGUE.inviteToLeague);
RouterV2.get('/:leagueId', API_LEAGUE.getLeague);
RouterV2.patch('/:leagueId/tournaments', API_LEAGUE.updateLeagueTournaments);
RouterV2.get('/:leagueId/performance', API_LEAGUE.getLeagueStandings);
RouterV2.patch('/:leagueId/performance', API_LEAGUE.updateLeaguePerformance);

ApplicationRouter.register('api/v2/leagues', RouterV2);
