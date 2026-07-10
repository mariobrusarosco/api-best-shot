import express from 'express';
import { env } from '../../config/env';
import { checkDatabase } from '../../core/database';

const healthRouter = express.Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/db', async (_req, res) => {
  const result = await checkDatabase();

  if (!result.ok) {
    res.status(503).json({
      status: 'error',
      database: result,
    });
    return;
  }

  res.json({
    status: 'ok',
    database: result,
  });
});

export default healthRouter;
