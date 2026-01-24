import { AdminMiddleware } from '@/domains/auth/middleware';
import express from 'express';
import { API_ADMIN } from '../api';
import { API_ADMIN_EXECUTION_JOBS } from '../api/execution-jobs';
import { API_ADMIN_SCHEDULER } from '../api/scheduler';
import { API_ADMIN_TOURNAMENTS } from '../api/tournaments';

const router = express.Router();

// Health check (public for monitoring)
router.get('/health', API_ADMIN.healthCheck);

// Database operations (admin only)
router.post('/seed', AdminMiddleware, API_ADMIN.seedDatabase);

// Data Provider Execution Tracking Routes (admin only)
router.get('/executions', AdminMiddleware, API_ADMIN_EXECUTION_JOBS.getExecutionJobs);

// Scheduler Management Routes (admin only)
router.post('/scheduler/trigger-match-polling', AdminMiddleware, API_ADMIN_SCHEDULER.triggerMatchPolling);
router.get('/scheduler/stats', AdminMiddleware, API_ADMIN_SCHEDULER.getPollingStats);
router.get('/scheduler/queue-stats', AdminMiddleware, API_ADMIN_SCHEDULER.getQueueStats);
router.get('/scheduler/jobs/:jobId', AdminMiddleware, API_ADMIN_SCHEDULER.getJobStatus);

// Tournament Management Routes (admin only)
router.get('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.getAllTournaments);
router.get('/tournaments/:tournamentId', AdminMiddleware, API_ADMIN_TOURNAMENTS.getTournamentById);
router.post('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTournament);

// Tournament Rounds Management (admin only)
router.post('/tournaments/:tournamentId/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.createRounds);
router.patch('/tournaments/:tournamentId/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateRounds);

// Tournament Teams Management (admin only)
router.post('/tournaments/:tournamentId/teams', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTeams);
router.patch('/tournaments/:tournamentId/teams', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateTeams);

// Tournament Matches Management (admin only)
router.post('/tournaments/:tournamentId/matches', AdminMiddleware, API_ADMIN_TOURNAMENTS.createMatches);
router.patch('/tournaments/:tournamentId/matches', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateMatches);
router.patch(
  '/tournaments/:tournamentId/rounds/:roundSlug/matches',
  AdminMiddleware,
  API_ADMIN_TOURNAMENTS.updateMatchesByRound
);

// Tournament Standings Management (admin only)
router.post('/tournaments/:tournamentId/standings', AdminMiddleware, API_ADMIN_TOURNAMENTS.createStandings);
router.patch('/tournaments/:tournamentId/standings', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateStandings);

// Tournament Knockout Rounds Management (admin only)
router.patch('/tournaments/:tournamentId/knockout-rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateKnockoutRounds);

// Tournament Execution Jobs (admin only)
router.get(
  '/tournaments/:tournamentId/execution-jobs',
  AdminMiddleware,
  API_ADMIN_TOURNAMENTS.getTournamentExecutionJobs
);

export default router;
