import express from 'express';
import healthRouter from '../../platform/health/routes';
import almanacRouter from '../../products/almanac/router';

const apiRouter = express.Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/almanac', almanacRouter);

export default apiRouter;
