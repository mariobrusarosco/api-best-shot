import { Request, Response } from 'express'

import tournamentModel from '../models/tournament.model'

function getAllTournaments(req: Request, res: Response) {
  res.send(tournamentModel.tournaments)
}

function getTournament(req: Request, res: Response) {
  const tournamentID = req?.params.tournamentID
  console.log(tournamentID)

  res.json(`Getting ${tournamentID}`)
}

function createTournament(req: Request, res: Response) {
  const body = req?.body

  if (!body.label) {
    return res.status(400).json({ message: 'You must provide a label for a tournament' })
  }

  res.json(body)
}

export default {
  getTournament,
  getAllTournaments,
  createTournament
}
