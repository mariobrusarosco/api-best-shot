import express from 'express';
import { API_DASHBOARD } from '../api';

const router = express.Router();

router.get('/', API_DASHBOARD.getDashboard);

export default router;
