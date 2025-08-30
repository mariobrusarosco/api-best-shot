import { API_ADMIN } from '@/domains/admin/api';
import { AdminMiddleware } from '@/domains/auth/middleware';
import express from 'express';

const router = express.Router();

// Health check (public for monitoring)
router.get('/health', API_ADMIN.healthCheck);

// Database operations (admin only)
router.post('/seed', AdminMiddleware, API_ADMIN.seedDatabase);

// Tournament Management Routes (admin only)
// router.get('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.getAllTournaments);
// router.post('/tournaments', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTournament);

// // Tournament Rounds Management (admin only)
// router.post('/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.createRounds);
// router.patch('/rounds', AdminMiddleware, API_ADMIN_TOURNAMENTS.updateRounds);

// Tournament Teams Management (admin only)
// router.post('/teams', AdminMiddleware, API_ADMIN_TOURNAMENTS.createTeams);

// Tournament Standings Management (admin only)
router.post('/standings', AdminMiddleware, API_ADMIN.createStandings);

export default router;
