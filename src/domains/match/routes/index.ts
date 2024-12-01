import type { Express } from 'express';
import express from 'express';

const MatchRouting = (app: Express) => {
  const mactchRouter = express.Router();

  app.use(`${process.env.API_VERSION}/match`, mactchRouter);
};

export default MatchRouting;
