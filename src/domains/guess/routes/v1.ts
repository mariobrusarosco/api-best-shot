import express from 'express';
import { AuthMiddleware } from '@/domains/auth/middleware';
import GuessController from '../controllers/guess-controllers';

const router = express.Router();
router.use(AuthMiddleware);
router.post('/', GuessController.createGuess);

export default router;
