import express from 'express';
import { API_DASHBOARD } from '../api';

const router = express.Router();

router.get('/', API_DASHBOARD.getDashboardDeprecated);

export default router;
