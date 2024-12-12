import { AuthMiddleware } from '@/domains/auth/middleware';
import { PerformanceController } from '@/domains/performance/controller';
import type { Express } from 'express';
import express from 'express';
import { MemberController } from '../controllers/member-controller';

const MemberRouting = (app: Express) => {
  const memberRouter = express.Router();

  memberRouter.get(
    '/performance',
    AuthMiddleware,
    PerformanceController.getLeaguePerformance
  );

  memberRouter.get('/', AuthMiddleware, MemberController.getMember);

  app.use(`${process.env.API_VERSION}/member`, memberRouter);
};

export default MemberRouting;
