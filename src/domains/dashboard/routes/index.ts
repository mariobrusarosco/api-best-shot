import express from 'express';
import { API_DASHBOARD } from '../api';
import ApplicationRouter from '@/router';

const RouterV1 = express.Router();
RouterV1.get('/', API_DASHBOARD.getDashboard);

const RouterV2 = express.Router();
RouterV2.get('/', API_DASHBOARD.getDashboard);


ApplicationRouter.register("api/v1/dashboard", RouterV1)
ApplicationRouter.register("api/v2/dashboard", RouterV2);
