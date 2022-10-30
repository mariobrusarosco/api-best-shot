import express from 'express'
import type { Express } from 'express'
import MatchController from '../controllers/match-controller'

const MatchRouting = (app: Express) => {
  const mactchRouter = express.Router()

  mactchRouter.get('/:matchId', MatchController.getMatch)
  mactchRouter.patch('/:matchId', MatchController.updateMatch)
  mactchRouter.post('/', MatchController.createMatch)

  app.use(`${process.env.API_V1_VERSION}/match`, mactchRouter)
}

export default MatchRouting