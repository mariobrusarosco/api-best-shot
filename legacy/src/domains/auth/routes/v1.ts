import express from 'express';
import { API_AUTH } from '../api';
import { API_MEMBER } from '@/domains/member/api';

const router = express.Router();
router.post('/', API_AUTH.authenticateUser);
router.post('/create', API_MEMBER.createMember);
router.delete('/', API_AUTH.unauthenticateUser);

export default router;
