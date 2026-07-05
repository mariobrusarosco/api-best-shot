import express from 'express';
import { API_ADMIN_CRON } from '../api/cron';

const router = express.Router();

router.post('/jobs', API_ADMIN_CRON.createJob);
router.patch('/jobs/:jobId/pause', API_ADMIN_CRON.pauseJob);
router.patch('/jobs/:jobId/resume', API_ADMIN_CRON.resumeJob);
router.post('/jobs/:jobId/run-now', API_ADMIN_CRON.runNow);

router.get('/targets', API_ADMIN_CRON.getTargetIds);
router.get('/jobs', API_ADMIN_CRON.listJobs);
router.get('/jobs/:jobId', API_ADMIN_CRON.getJobById);
router.get('/runs', API_ADMIN_CRON.listRuns);
router.get('/runs/:runId', API_ADMIN_CRON.getRunById);

export default router;
