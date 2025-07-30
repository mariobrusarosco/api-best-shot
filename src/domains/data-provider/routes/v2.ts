import express from 'express';
import {
  API_TOURNAMENT_V2,
  API_TOURNAMENT_ROUNDS_V2,
  API_TEAMS_V2,
  API_MATCH_V2,
  API_STANDINGS_V2,
} from '../api';

const router = express.Router();
// router.use(AuthMiddleware);

// TOURNAMENTS
router.post('/tournaments/create', API_TOURNAMENT_V2.create);
// TOURNAMENT ROUNDS
router.post('/rounds/create', API_TOURNAMENT_ROUNDS_V2.create);
// TEAMS
router.post('/teams/create', API_TEAMS_V2.create);
// MATCHES
router.post('/matches', API_MATCH_V2.create);
router.patch('/matches', API_MATCH_V2.updateMatchesForRound);
// STANDINGS
router.post('/standings', API_STANDINGS_V2.create);
router.patch('/standings', API_STANDINGS_V2.update);

export default router;
