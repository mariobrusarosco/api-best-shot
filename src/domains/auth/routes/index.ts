import express from 'express';
import ApplicationRouter from '@/router';
import { API_Member } from '@/domains/member/api';
import { API_Auth } from '../api';
import AuthController from '../controllers/auth-controllers';

const RouterV1 = express.Router();
RouterV1.post('/', AuthController.authenticateUser);
RouterV1.post('/create', API_Member.createMember);
RouterV1.delete('/', API_Auth.unauthenticateUser);


const RouterV2 = express.Router();
RouterV2.post('/', AuthController.authenticateUser);
RouterV2.post('/create', API_Member.createMember);
RouterV2.delete('/', API_Auth.unauthenticateUser);


ApplicationRouter.register("api/v1/auth", RouterV1);
ApplicationRouter.register("api/v2/auth", RouterV2);
