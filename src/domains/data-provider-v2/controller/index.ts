import { type Response } from 'express';
import { TournamentController } from '../controller/tournaments';
import { TournamentRequest } from '../interface';

const setup = async (req: TournamentRequest, res: Response) => {
  // SETUP TOURNAMENT
  const newTournament = await TournamentController.setupTournament(req, res);

  // SETUP TOURNAMENTS ROUNDS
  // const newRounds = await TournamentRoundsController.setup(newTournament);

  // SETUP MATCHES

  return res.status(200).send({ newTournament });
};

const updateTournament = async (req: TournamentRequest, res: Response) => {
  // UPDATE TOURNAMENT
  const updatedTournament = await TournamentController.updateTournament(req, res);

  // UPDATE TOURNAMENT ROUNDS
  // const updatedRounds = await TournamentRoundsController.setup(updatedTournament);

  // UPDATE MATCHES

  return res.status(200).send({ updatedTournament });
};

export const API_Dataprovider = {
  setup,
  updateTournament,
};
