import express from 'express';
import { API_ADMIN } from '../api';
import { API_ADMIN_EXECUTIONS } from '../api/executions';
import { AdminMiddleware } from '@/domains/auth/middleware';

const router = express.Router();

// GET /api/v1/admin/health - Health check (public for monitoring)
router.get('/health', API_ADMIN.healthCheck);

// POST /api/v1/admin/seed - Seed the database (admin only)
router.post('/seed', AdminMiddleware, API_ADMIN.seedDatabase);

// POST /api/v1/admin/promote - Promote member to admin (admin only)
router.post('/promote', AdminMiddleware, API_ADMIN.promoteToAdmin);

// POST /api/v1/admin/demote - Demote admin to member (admin only)
router.post('/demote', AdminMiddleware, API_ADMIN.demoteFromAdmin);

// Data Provider Execution Tracking Routes (admin only)
// GET /api/v1/admin/executions - List all executions with filtering
router.get('/executions', AdminMiddleware, API_ADMIN_EXECUTIONS.getAllExecutions);

// GET /api/v1/admin/executions/tournament/:tournamentId - Get executions for specific tournament
router.get('/executions/tournament/:tournamentId', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionsByTournament);

// GET /api/v1/admin/executions/stats - Get execution statistics
router.get('/executions/stats', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionStats);

// GET /api/v1/admin/executions/:id - Get specific execution details
router.get('/executions/:id', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionById);

// GET /api/v1/admin/executions/:id/report - Fetch detailed operation report
router.get('/executions/:id/report', AdminMiddleware, API_ADMIN_EXECUTIONS.getExecutionReport);

export default router;
