import { AuthMiddleware } from '@/domains/auth/middleware';
import express from 'express';
import { API_MEMBER } from '../api';

const router = express.Router();
router.get('/', AuthMiddleware, API_MEMBER.getMember);
router.post('/', API_MEMBER.createMember);

export default router;
