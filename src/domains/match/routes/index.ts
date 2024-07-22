import express from 'express'
import type { Express } from 'express'
import MatchController from '../controllers/match-controller'

const MatchRouting = (app: Express) => {
  const mactchRouter = express.Router()

  mactchRouter.post('/', MatchController.createMatch)

  app.use(`${process.env.API_VERSION}/match`, mactchRouter)
}

export default MatchRouting
