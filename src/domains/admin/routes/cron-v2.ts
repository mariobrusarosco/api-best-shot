import express from 'express';
import { API_ADMIN_CRON } from '../api/cron';

const router = express.Router();

// D2 - Write endpoints
router.post('/jobs', API_ADMIN_CRON.createJob);
router.patch('/jobs/:jobId/pause', API_ADMIN_CRON.pauseJob);
router.patch('/jobs/:jobId/resume', API_ADMIN_CRON.resumeJob);
router.post('/jobs/:jobId/new-version', API_ADMIN_CRON.createNewVersion);
router.post('/jobs/:jobId/run-now', API_ADMIN_CRON.runNow);

export default router;
