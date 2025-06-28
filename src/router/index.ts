import express from 'express';
import adminV1Router from '@/domains/admin/routes/v1';
import aiV2Router from '@/domains/ai/routes/v2';

const apiRouter = express.Router();

// Register admin v1 router
apiRouter.use('/v1/admin', adminV1Router);
// Register ai v2 router
apiRouter.use('/v2/ai', aiV2Router);

export default apiRouter;
