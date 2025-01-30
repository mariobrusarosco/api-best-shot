import express from 'express';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_MEMBER } from '../api';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);  // Add middleware for all member routes
RouterV1.get('/performance', API_MEMBER.getGeneralTournamentPerformance);
RouterV1.get('/', API_MEMBER.getMember);

ApplicationRouter.register("api/v1/member", RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);  // Add middleware for all member routes
RouterV2.get('/performance', API_MEMBER.getGeneralTournamentPerformanceV2);
RouterV2.get('/', API_MEMBER.getMemberV2);

ApplicationRouter.register("api/v2/member", RouterV2);



