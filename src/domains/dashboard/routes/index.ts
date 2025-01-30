import express from 'express';
import ApplicationRouter from '@/router';
import { API_DASHBOARD } from "@/domains/dashboard/api"

const RouterV1 = express.Router();
RouterV1.get('/', API_DASHBOARD.getDashboardDeprecated);

const RouterV2 = express.Router();
RouterV2.get('/', API_DASHBOARD.getDashboard);


ApplicationRouter.register("api/v1/dashboard", RouterV1)
ApplicationRouter.register("api/v2/dashboard", RouterV2);
