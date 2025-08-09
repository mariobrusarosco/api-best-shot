import express from 'express';
import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_LEAGUE } from '../api';

const router = express.Router();
router.use(AuthMiddleware);
router.post('/', API_LEAGUE.createLeague);
router.get('/', API_LEAGUE.getLeagues);
router.post('/invitation', API_LEAGUE.inviteToLeague);
router.get('/:leagueId', API_LEAGUE.getLeague);
router.patch('/:leagueId/tournaments', API_LEAGUE.updateLeagueTournaments);
router.get('/:leagueId/performance', API_LEAGUE.getLeagueStandings);
router.patch('/:leagueId/performance', API_LEAGUE.updateLeaguePerformance);

export default router;
