import express from 'express';
import { InternalMiddleware } from '@/domains/auth/internal-middleware';
import {
  API_TOURNAMENT_V2,
  API_TOURNAMENT_ROUNDS_V2,
  API_TEAMS_V2,
  API_MATCH_V2,
  API_STANDINGS_V2,
  API_SCHEDULER,
} from '../api';

const router = express.Router();
router.use(InternalMiddleware);

// TOURNAMENTS
router.post('/tournaments', API_TOURNAMENT_V2.create);
// TOURNAMENT ROUNDS
router.post('/rounds', API_TOURNAMENT_ROUNDS_V2.create);
router.patch('/rounds', API_TOURNAMENT_ROUNDS_V2.update);
// TEAMS
router.post('/teams', API_TEAMS_V2.create);
// MATCHES
router.post('/matches', API_MATCH_V2.create);
router.patch('/matches', API_MATCH_V2.updateMatchesForRound);
router.patch(
  '/tournaments/:tournamentId/matches/:roundSlug',
  API_MATCH_V2.updateMatchesForRound
);

// STANDINGS
router.post('/standings', API_STANDINGS_V2.create);
router.patch('/standings', API_STANDINGS_V2.update);
router.patch('/tournaments/:tournamentId/standings', API_STANDINGS_V2.update);

// SCHEDULER
router.post('/scheduler', API_SCHEDULER.dailyRoutine);

// TOURNAMENT KNOCKOUT UPDATES (for Lambda callbacks)
router.post(
  '/tournaments/:tournamentId/rounds/knockout-update',
  API_TOURNAMENT_ROUNDS_V2.update
);

export default router;
