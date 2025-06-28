import express from 'express';
import { API_MEMBER } from '../api';
import { AuthMiddleware } from '@/domains/auth/middleware';

const router = express.Router();
router.get('/', AuthMiddleware, API_MEMBER.getMember);
router.post('/', API_MEMBER.createMember);
router.get('/performance', AuthMiddleware, API_MEMBER.getGeneralTournamentPerformance);

export default router;
