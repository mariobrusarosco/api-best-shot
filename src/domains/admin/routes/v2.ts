import { API_ADMIN } from '@/domains/admin/api';
import { API_ADMIN_TOURNAMENTS } from '@/domains/admin/api/tournaments';
import { AdminMiddleware } from '@/domains/auth/middleware';
import express from 'express';
import { API_ADMIN_STANDINGS } from '../api/standings';

const router = express.Router();

// Health check (public for monitoring)
router.get('/health', API_ADMIN.healthCheck);

// Database operations (admin only)
router.post('/seed', AdminMiddleware, API_ADMIN.seedDatabase);

// Tournament Management Routes (admin only)
router.get('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.getAllTournaments);
router.post('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTournament);

// // Tournament Rounds Management (admin only)
// router.post('/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.createRounds);
// router.patch('/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateRounds);

// Tournament Teams Management (admin only)
// router.post('/teams', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTeams);

// Tournament Standings Management (admin only)
// TEMPORARY: Remove auth for testing
router.post('/standings', API_ADMIN_STANDINGS.createStandings);
router.patch('/standings', API_ADMIN_STANDINGS.updateStandings);

export default router;
