import express from 'express';
import { AuthMiddleware } from '@/domains/auth/middleware';

const router = express.Router();
router.use(AuthMiddleware);

export default router;
