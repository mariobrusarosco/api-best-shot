import express from 'express';
import ApplicationRouter from '@/router';
import { API_MEMBER } from '../api';
import { AuthMiddleware } from '@/domains/auth/middleware';

const RouterV1 = express.Router();
RouterV1.get('/', AuthMiddleware, API_MEMBER.getMember);
RouterV1.post('/', API_MEMBER.createMember);
RouterV1.get('/performance', AuthMiddleware, API_MEMBER.getGeneralTournamentPerformance);

const RouterV2 = express.Router();
RouterV2.get('/', AuthMiddleware, API_MEMBER.getMemberV2);
RouterV2.post('/', API_MEMBER.createMember);
RouterV2.get(
  '/performance',
  AuthMiddleware,
  API_MEMBER.getGeneralTournamentPerformanceV2
);

ApplicationRouter.register('api/v1/member', RouterV1);
ApplicationRouter.register('api/v2/member', RouterV2);
