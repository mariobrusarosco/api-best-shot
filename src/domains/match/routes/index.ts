import express from 'express';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);

ApplicationRouter.register("api/v1/match", RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);

ApplicationRouter.register("api/v2/match", RouterV2);
