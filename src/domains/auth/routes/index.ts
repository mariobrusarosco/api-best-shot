import express from 'express';
import ApplicationRouter from '@/router';
import { API_MEMBER } from '@/domains/member/api';
import { API_AUTH } from '../api';

const RouterV1 = express.Router();
RouterV1.post('/', API_AUTH.authenticateUser);
RouterV1.post('/create', API_MEMBER.createMember);
RouterV1.delete('/', API_AUTH.unauthenticateUser);

const RouterV2 = express.Router();
RouterV2.post('/', API_AUTH.authenticateUser);
RouterV2.post('/create', API_MEMBER.createMember);
RouterV2.delete('/', API_AUTH.unauthenticateUser);

ApplicationRouter.register("api/v1/auth", RouterV1);
ApplicationRouter.register("api/v2/auth", RouterV2);
