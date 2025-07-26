import express from 'express';
import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_TOURNAMENT } from '../api';
import { API_MATCH } from '@/domains/match/api';
import { API_GUESS } from '@/domains/guess/api';
import { API_PERFORMANCE } from '@/domains/performance/api';

const router = express.Router();
router.use(AuthMiddleware);

router.get('/', API_TOURNAMENT.getAllTournaments);
router.get('/:tournamentId', API_TOURNAMENT.getTournamentDetails);
router.get('/:tournamentId/matches/:roundId', API_MATCH.getMatchesByTournament);
router.get('/:tournamentId/guess', API_GUESS.getMemberGuesses);
router.get('/:tournamentId/score', API_TOURNAMENT.getTournamentScore);
router.get(
  '/:tournamentId/performance',
  API_TOURNAMENT.getTournamentPerformanceForMember
);
router.patch('/:tournamentId/performance', API_PERFORMANCE.updateTournamentPerformance);
router.get('/:tournamentId/standings', API_TOURNAMENT.getTournamentStandings);
router.post('/:tournamentId/setup', API_TOURNAMENT.setupTournament);

export default router;