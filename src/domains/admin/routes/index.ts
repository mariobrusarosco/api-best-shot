import express from 'express';
import ApplicationRouter from '@/router';
import { API_ADMIN } from '../api';

const RouterV1 = express.Router();

// GET /api/v1/admin/health - Health check
RouterV1.get('/health', API_ADMIN.healthCheck);

// POST /api/v1/admin/seed - Seed the database
RouterV1.post('/seed', API_ADMIN.seedDatabase);

ApplicationRouter.register('api/v1/admin', RouterV1);
