import { Router } from 'express';
import ApplicationRouter from '@/router';
import API_HEALTH_V1 from './api/v1';

const router = Router();

// Basic health check endpoint
router.get('/', API_HEALTH_V1.check);

// Playwright-specific health check
router.get('/playwright', API_HEALTH_V1.checkPlaywright);

// Register routes
ApplicationRouter.register('health', router);

export default router;
