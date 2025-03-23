import express from 'express';
import ApplicationRouter from '@/router';
import { API_AI } from '@/domains/ai/api';

const RouterV2 = express.Router();
RouterV2.get('/predict/match/:matchId', API_AI.getMatchPrediction);

ApplicationRouter.register('api/v2/ai', RouterV2);
