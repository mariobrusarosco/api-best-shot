import express from 'express';
import { API_MEMBER } from '../api';
import { AuthMiddleware } from '@/domains/auth/middleware';

const router = express.Router();
router.get('/', AuthMiddleware, API_MEMBER.getMemberV2);
router.post('/', API_MEMBER.createMember);
router.get('/performance', AuthMiddleware, API_MEMBER.getGeneralTournamentPerformanceV2);

export default router;
