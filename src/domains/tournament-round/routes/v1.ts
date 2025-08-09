import { Router } from 'express';
import { TournamentRoundController } from '../controllers/tournament-round-controller';

const router = Router();

// GET /api/v1/tournaments/:tournamentId/rounds
router.get('/tournaments/:tournamentId/rounds', TournamentRoundController.getAllRounds);

// GET /api/v1/tournaments/:tournamentId/rounds/:roundSlug
router.get(
  '/tournaments/:tournamentId/rounds/:roundSlug',
  TournamentRoundController.getRound
);

// GET /api/v1/tournaments/:tournamentId/rounds/knockout
router.get(
  '/tournaments/:tournamentId/rounds/knockout',
  TournamentRoundController.getKnockoutRounds
);

// POST /api/v1/tournaments/rounds
router.post('/tournaments/rounds', TournamentRoundController.createTournamentRound);

// POST /api/v1/tournaments/rounds/bulk
router.post(
  '/tournaments/rounds/bulk',
  TournamentRoundController.createMultipleTournamentRounds
);

export default router;
