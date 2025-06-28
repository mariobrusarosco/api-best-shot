import express from 'express';
import { API_AI } from '@/domains/ai/api';

const router = express.Router();
router.get('/predict/match/:matchId', API_AI.getMatchPrediction);

export default router;
