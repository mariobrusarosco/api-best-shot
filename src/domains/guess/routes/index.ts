import { AuthMiddleware } from '@/domains/auth/middleware';
import type { Express } from 'express';
import express from 'express';
import GuessController from '../controllers/guess-controllers';

const GuessRouting = (app: Express) => {
  const guessRouter = express.Router();

  guessRouter.post('/', GuessController.createGuess);
  // guessRouter.get('/', API_Guess.getMemberGuesses);

  app.use(`${process.env.API_VERSION}/guess`, AuthMiddleware, guessRouter);
};

export default GuessRouting;
