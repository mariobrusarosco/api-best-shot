import { AdminMiddleware } from '@/domains/auth/middleware';
import express from 'express';
import { API_ADMIN } from '../api';
import { API_ADMIN_EXECUTIONS } from '../api/executions';
import { API_ADMIN_TOURNAMENTS } from '../api/tournaments';

const router = express.Router();

// Health check (public for monitoring)
router.get('/health', API_ADMIN.healthCheck);

// Database operations (admin only)
router.post('/seed', AdminMiddleware, API_ADMIN.seedDatabase);

// User role management (admin only)
router.post('/promote', AdminMiddleware, API_ADMIN.promoteToAdmin);
router.post('/demote', AdminMiddleware, API_ADMIN.demoteFromAdmin);

// Data Provider Execution Tracking Routes (admin only)
router.get('/executions', AdminMiddleware, API_ADMIN_EXECUTIONS.getAllExecutions);
router.get('/executions/tournament/:tournamentId', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionsByTournament);
router.get('/executions/stats', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionStats);
router.get('/executions/:id', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionById);
router.get('/executions/:id/report', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionReport);

// Tournament Management Routes (admin only)
router.get('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.getAllTournaments);
router.post('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTournament);

// Execution Jobs Route (admin only)
router.get('/execution-jobs', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionJobs);

// Tournament Rounds Management (admin only)
router.post('/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.createRounds);
router.patch('/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateRounds);

// Tournament Teams Management (admin only)
router.post('/teams', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTeams);

// Tournament Standings Management (admin only)
router.post('/standings', AdminMiddleware, API_ADMIN_TOURNAMENTS.createStandings);

export default router;
