import express from 'express'
import type { Express } from 'express'
import LeagueController from '../controllers/league-controllers'

const LeagueRouting = (app: Express) => {
  const leagueRouter = express.Router()

  leagueRouter.post('/', LeagueController.createLeague)
  leagueRouter.get('/', LeagueController.getAllLeagues)
  leagueRouter.get('/:leagueId', LeagueController.getLeague)
  leagueRouter.patch('/:leagueId', LeagueController.updateLeague)

  app.use(`${process.env.API_V1_VERSION}/league`, leagueRouter)
}

export default LeagueRouting
