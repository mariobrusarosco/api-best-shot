import type { Express } from 'express';
import express from 'express';
import { API_Dashboard } from '../api';

const DashboardRouting = (app: Express) => {
  const dashboardRouter = express.Router();

  dashboardRouter.get('/', API_Dashboard.getDashboard);

  app.use(`${process.env.API_VERSION}/dashboard`, dashboardRouter);
};

export default DashboardRouting;
