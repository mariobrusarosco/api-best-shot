import { API_ADMIN } from '@/domains/admin/api';
import { API_ADMIN_TOURNAMENTS } from '@/domains/admin/api/tournaments';
import { API_ADMIN_TEAMS } from '@/domains/admin/api/teams';
import { API_ADMIN_ROUNDS } from '@/domains/admin/api/rounds';
import { API_ADMIN_MATCHES } from '@/domains/admin/api/matches';
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

// Tournament Rounds Management (admin only)
// TEMPORARY: Remove auth for testing
router.post('/rounds', API_ADMIN_ROUNDS.createRounds);
router.patch('/rounds', API_ADMIN_ROUNDS.updateRounds);

// Tournament Teams Management (admin only)
// TEMPORARY: Remove auth for testing
router.post('/teams', API_ADMIN_TEAMS.createTeams);

// Tournament Standings Management (admin only)
// TEMPORARY: Remove auth for testing
router.post('/standings', API_ADMIN_STANDINGS.createStandings);
router.patch('/standings', API_ADMIN_STANDINGS.updateStandings);

// Tournament Matches Management (admin only)
// TEMPORARY: Remove auth for testing
router.post('/matches', API_ADMIN_MATCHES.createMatches);
router.patch('/matches', API_ADMIN_MATCHES.updateMatches);

export default router;
