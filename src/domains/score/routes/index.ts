import express from 'express'
import type { Express } from 'express'
import ScoreController from '../controllers/score-controllers'

const ScoreRouting = (app: Express) => {
  const scoreRouter = express.Router()

  scoreRouter.get('/league/:leagueId', ScoreController.getLeagueScore)

  app.use(`${process.env.API_VERSION}/scores`, scoreRouter)
}

export default ScoreRouting
