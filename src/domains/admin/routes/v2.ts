import { API_ADMIN } from '@/domains/admin/api';
import { API_ADMIN_MATCHES } from '@/domains/admin/api/matches';
import { API_ADMIN_REPORTS } from '@/domains/admin/api/reports';
import { API_ADMIN_ROUNDS } from '@/domains/admin/api/rounds';
import { API_ADMIN_SCHEDULER } from '@/domains/admin/api/scheduler';
import { API_ADMIN_STANDINGS } from '@/domains/admin/api/standings';
import { API_ADMIN_TEAMS } from '@/domains/admin/api/teams';
import { API_ADMIN_TOURNAMENTS } from '@/domains/admin/api/tournaments';
import { AdminMiddleware } from '@/domains/auth/middleware';
import express from 'express';

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
router.post('/rounds/knockout-update', API_ADMIN_ROUNDS.knockoutUpdate);

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

// TEMPORARY: Remove auth for testing
router.get('/reports', API_ADMIN_REPORTS.getReports);

// Job Scheduling (admin only)
// TEMPORARY: Remove auth for testing
router.post('/schedule', API_ADMIN_SCHEDULER.scheduleJob);
router.post('/scheduler/jobs', API_ADMIN_SCHEDULER.scheduleJob);

// Job Monitoring (admin only)
// TEMPORARY: Remove auth for testing
router.get('/scheduler/jobs', API_ADMIN_SCHEDULER.getScheduledJobs);
router.get('/scheduler/jobs/stats', API_ADMIN_SCHEDULER.getJobStats);

// Parameterized routes must come after specific routes
router.get('/scheduler/jobs/:id', API_ADMIN_SCHEDULER.getJobById);
router.get('/scheduler/jobs/tournament/:tournamentId', API_ADMIN_SCHEDULER.getJobsByTournament);

export default router;
