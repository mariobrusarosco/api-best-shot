import express from 'express';
import adminV1Router from '@/domains/admin/routes/v1';

const apiRouter = express.Router();

// Register admin v1 router
apiRouter.use('/v1/admin', adminV1Router);

export default apiRouter;
