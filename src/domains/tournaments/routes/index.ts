import express from 'express'
import type { Express } from 'express'
import tournamentController from '../../../controllers/tournament.controller'

const TournamentRouting = (app: Express) => {
  const tournamentRouter = express.Router()

  tournamentRouter.post('/', tournamentController.createTournament)
  tournamentRouter.get('/', tournamentController.getAllTournaments)
  tournamentRouter.get('/:tournamentID', tournamentController.getTournament)

  app.use(`${process.env.API_V1_VERSION}/tournament`, tournamentRouter)
}

export default TournamentRouting
