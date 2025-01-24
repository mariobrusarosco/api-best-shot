import express from 'express';
import { API_Member } from '../api';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);  // Add middleware for all member routes
RouterV1.get('/performance', API_Member.getGeneralTournamentPerformance);
RouterV1.get('/', API_Member.getMember);

ApplicationRouter.register("api/v1/member", RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);  // Add middleware for all member routes
RouterV2.get('/performance', API_Member.getGeneralTournamentPerformance);
RouterV2.get('/', API_Member.getMember);

ApplicationRouter.register("api/v2/member", RouterV2);



