import express from 'express'
import type { Express } from 'express'
import GuessController from '../controllers/guess-controllers'

const GuessRouting = (app: Express) => {
  const guessRouter = express.Router()

  guessRouter.post('/', GuessController.createGuess)
  guessRouter.get('/', GuessController.getMemberGuesses)

  app.use(`${process.env.API_VERSION}/guess`, guessRouter)
}

export default GuessRouting
