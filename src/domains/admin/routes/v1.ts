import express from 'express';
import { API_ADMIN } from '../api';

const router = express.Router();

// GET /api/v1/admin/health - Health check
router.get('/health', API_ADMIN.healthCheck);

// POST /api/v1/admin/seed - Seed the database
router.post('/seed', API_ADMIN.seedDatabase);

export default router;
