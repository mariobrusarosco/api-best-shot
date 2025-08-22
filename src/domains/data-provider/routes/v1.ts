import express from 'express';
import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_TEAMS, API_TOURNAMENT, API_TOURNAMENT_ROUNDS, API_MATCHES, API_SCHEDULER, API_STANDINGS } from '../api';

const router = express.Router();
router.use(AuthMiddleware);

// TOURNAMENTS
router.post('/tournaments', API_TOURNAMENT.setup);
router.patch('/tournaments/:tournamentId', API_TOURNAMENT.update);

// TOURNAMENT ROUNDS
router.post('/tournaments/:tournamentId/rounds', API_TOURNAMENT_ROUNDS.createRounds);
router.patch('/tournaments/:tournamentId/rounds', API_TOURNAMENT_ROUNDS.updateRounds);
router.post('/tournaments/:tournamentId/rounds/knockout-update', API_TOURNAMENT_ROUNDS.knockoutRoundsUpdate);

// TEAMS
router.post('/tournaments/:tournamentId/teams', API_TEAMS.createTeams);
router.patch('/tournaments/:tournamentId/teams', API_TEAMS.updateTeams);

// MATCHES
router.post('/tournaments/:tournamentId/matches', API_MATCHES.createMatches);
router.patch('/tournaments/:tournamentId/matches', API_MATCHES.updateMatches);
router.patch('/tournaments/:tournamentId/matches/:roundSlug', API_MATCHES.updateMatchesForRound);

// STANDINGS
router.post('/tournaments/:tournamentId/standings', API_STANDINGS.createStandings);
router.patch('/tournaments/:tournamentId/standings', API_STANDINGS.updateStandings);

// SCHEDULER
router.post('/scheduler', API_SCHEDULER.dailyRoutine);

export default router;
