import { AuthMiddleware } from '@/domains/auth/middleware';
import type { Express } from 'express';
import express from 'express';
import { API_Member } from '../api';

const MemberRouting = (app: Express) => {
  const memberRouter = express.Router();

  memberRouter.get('/performance', API_Member.getGeneralTournamentPerformance);
  memberRouter.get('/', API_Member.getMember);

  app.use(`${process.env.API_VERSION}/member`, AuthMiddleware, memberRouter);
};

export default MemberRouting;
