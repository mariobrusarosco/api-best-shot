import { API_Member } from '@/domains/member/api';
import type { Express } from 'express';
import express from 'express';
import { API_Auth } from '../api';
import AuthController from '../controllers/auth-controllers';

const AuthRouting = (app: Express) => {
  const memberRouter = express.Router();

  memberRouter.post('/', AuthController.authenticateUser);
  memberRouter.post('/create', API_Member.createMember);
  memberRouter.delete('/', API_Auth.unauthenticateUser);

  app.use(`${process.env.API_VERSION}/auth`, memberRouter);
};

export default AuthRouting;
