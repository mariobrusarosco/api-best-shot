import { AuthMiddleware } from '@/domains/auth/middleware';
import express from 'express';
import { API_LEAGUE } from '../api';

const router = express.Router();
router.use(AuthMiddleware);
router.post('/', API_LEAGUE.createLeague);
router.get('/', API_LEAGUE.getLeagues);
router.post('/invitation', API_LEAGUE.inviteToLeague);
router.get('/:leagueId', API_LEAGUE.getLeague);
router.get('/:leagueId/scoreboard', API_LEAGUE.getScoreboard);
router.patch('/:leagueId/tournaments', API_LEAGUE.updateLeagueTournaments);

export default router;
