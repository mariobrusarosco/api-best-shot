import express from 'express'
import type { Express } from 'express'
import LeagueController from '../controllers/league-controller'

const LeagueRouting = (app: Express) => {
  const leagueRouter = express.Router()

  leagueRouter.post('/', LeagueController.createLeague)
  leagueRouter.get('/', LeagueController.getLeagues)
  leagueRouter.post('/invitation', LeagueController.inviteToLeague)

  app.use(`${process.env.API_VERSION}/leagues`, leagueRouter)
}

export default LeagueRouting
