import express from 'express';
import healthRouter from '@/domains/health/routes';

const apiRouter = express.Router();

apiRouter.use('/health', healthRouter);

export default apiRouter;
