import express from 'express';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';
import GuessController from '../controllers/guess-controllers';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);
RouterV1.post('/', GuessController.createGuess);

ApplicationRouter.register('api/v1/guess', RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);
RouterV2.post('/', GuessController.createGuess);

ApplicationRouter.register('api/v2/guess', RouterV2);
