import express from 'express';
import adminV1Router from '@/domains/admin/routes/v1';
import aiV2Router from '@/domains/ai/routes/v2';
import {
  v1Router as authV1Router,
  v2Router as authV2Router,
} from '@/domains/auth/routes';

const apiRouter = express.Router();

// Register admin v1 router
apiRouter.use('/v1/admin', adminV1Router);
// Register ai v2 router
apiRouter.use('/v2/ai', aiV2Router);
// Register auth v1 and v2 routers
apiRouter.use('/v1/auth', authV1Router);
apiRouter.use('/v2/auth', authV2Router);

export default apiRouter;
