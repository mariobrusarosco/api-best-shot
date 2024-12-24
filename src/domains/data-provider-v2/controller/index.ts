import { type Response } from 'express';
import { TournamentController } from '../controller/tournaments';
import { TournamentRequest } from '../interface';

const setup = async (req: TournamentRequest, res: Response) => {
  // SETUP TOURNAMENT
  const newTournament = await TournamentController.setupTournament(req, res);
  // SETUP TOURNAMENTS ROUNDS
  // SETUP MATCHES

  return res.status(200).send({ newTournament });
};

export const API_Dataprovider = {
  setup,
};
