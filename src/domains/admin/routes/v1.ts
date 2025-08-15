import express from 'express';
import { API_ADMIN } from '../api';
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

export default router;
