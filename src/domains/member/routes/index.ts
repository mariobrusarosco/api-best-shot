import { AuthMiddleware } from '@/domains/auth/middleware';
import type { Express } from 'express';
import express from 'express';
import { MemberController } from '../controllers/member-controller';

const MemberRouting = (app: Express) => {
  const memberRouter = express.Router();

  memberRouter.get('/performance', MemberController.getMemberPerformance);
  memberRouter.get('/', MemberController.getMember);

  app.use(`${process.env.API_VERSION}/member`, AuthMiddleware, memberRouter);
};

export default MemberRouting;
