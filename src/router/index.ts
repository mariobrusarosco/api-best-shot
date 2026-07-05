import express from 'express';
import adminRouter from '@/domains/admin/routes';
import healthRouter from '@/domains/health/routes';

const apiRouter = express.Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/admin', adminRouter);

export default apiRouter;
