import express from 'express'
import type { Express } from 'express'
import TournamentController from '../controllers/tournament-controllers'

const TournamentRouting = (app: Express) => {
  const tournamentRouter = express.Router()

  tournamentRouter.post('/', TournamentController.createTournament)
  tournamentRouter.get('/', TournamentController.getAllTournaments)
  tournamentRouter.get('/:tournamentId', TournamentController.getTournament)
  tournamentRouter.patch(
    '/:tournamentId/external',
    TournamentController.updateTournamentFromExternalSource
  )
  tournamentRouter.post(
    '/:tournamentId/external',
    TournamentController.createTournamentFromExternalSource
  )

  app.use(`${process.env.API_VERSION}/tournament`, tournamentRouter)
}

export default TournamentRouting
