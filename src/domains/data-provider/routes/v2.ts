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
import { API_SCHEDULER_CALLBACK, API_SCHEDULER_MONITOR } from '../api/v2/scheduler';

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
router.patch('/tournaments/:tournamentId/matches/:roundSlug', API_MATCH_V2.updateMatchesForRound);

// STANDINGS
router.post('/standings', API_STANDINGS_V2.create);
router.patch('/standings', API_STANDINGS_V2.update);
router.patch('/tournaments/:tournamentId/standings', API_STANDINGS_V2.update);

// SCHEDULER
router.post('/scheduler', API_SCHEDULER.dailyRoutine);

// SCHEDULER MONITORING AND CALLBACKS
router.post('/scheduler/callback', API_SCHEDULER_CALLBACK.handleSchedulerCallback);
router.get('/scheduler/jobs', API_SCHEDULER_MONITOR.getAllJobs);
router.get('/scheduler/jobs/active', API_SCHEDULER_MONITOR.getActiveJobs);
router.get('/scheduler/jobs/failed', API_SCHEDULER_MONITOR.getFailedJobs);
router.get('/scheduler/jobs/stats', API_SCHEDULER_MONITOR.getStats);
router.get('/scheduler/jobs/:id', API_SCHEDULER_MONITOR.getJobById);
router.post('/scheduler/jobs/:id/retry', API_SCHEDULER_MONITOR.retryJob);
router.get('/scheduler/tournaments/:tournamentId/jobs', API_SCHEDULER_MONITOR.getJobsByTournament);

// TOURNAMENT KNOCKOUT UPDATES (for Lambda callbacks)
router.post('/tournaments/:tournamentId/rounds/knockout-update', API_TOURNAMENT_ROUNDS_V2.update);

export default router;
