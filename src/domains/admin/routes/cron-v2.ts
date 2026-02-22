import express from 'express';
import { API_ADMIN_CRON } from '../api/cron';

const router = express.Router();

// D2 - Write endpoints
router.post('/jobs', API_ADMIN_CRON.createJob);
router.patch('/jobs/:jobId/pause', API_ADMIN_CRON.pauseJob);
router.patch('/jobs/:jobId/resume', API_ADMIN_CRON.resumeJob);
router.post('/jobs/:jobId/new-version', API_ADMIN_CRON.createNewVersion);
router.post('/jobs/:jobId/run-now', API_ADMIN_CRON.runNow);

// D3 - Read endpoints
router.get('/jobs', API_ADMIN_CRON.listJobs);
router.get('/jobs/:jobId', API_ADMIN_CRON.getJobById);
router.get('/runs', API_ADMIN_CRON.listRuns);
router.get('/runs/:runId', API_ADMIN_CRON.getRunById);

export default router;
