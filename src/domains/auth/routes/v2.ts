import express from 'express';
import { API_AUTH } from '../api';
import { API_MEMBER } from '@/domains/member/api';
import { Auth0AccessTokenMiddleware } from '../auth0-middleware';

const router = express.Router();
router.post('/', Auth0AccessTokenMiddleware, API_AUTH.authenticateUserWithAuth0Proof);
router.post('/create', API_MEMBER.createMember);
router.delete('/', API_AUTH.unauthenticateUser);

export default router;
