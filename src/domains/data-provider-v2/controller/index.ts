import { type Response } from 'express';
import { TournamentController } from '../controller/tournaments';
import { TournamentRequest } from '../interface';
import { TournamentRoundsController } from './tournament-rounds';

const setup = async (req: TournamentRequest, res: Response) => {
  // SETUP TOURNAMENT
  const newTournament = await TournamentController.setupTournament(req, res);
  if (!newTournament) throw new Error('Tournament not created');

  // SETUP TOURNAMENTS ROUNDS
  const newRounds = await TournamentRoundsController.setup(newTournament);

  if (!newRounds) throw new Error('Tournament rounds not created');

  // SETUP MATCHES
  const createdMatches = newRounds.map(async round => {});

  return res.status(200).send({ newTournament });
};

const update = async (req: TournamentRequest, res: Response) => {
  // UPDATE TOURNAMENT
  const updatedTournament = await TournamentController.updateTournament(req, res);
  if (!updatedTournament) throw new Error('Tournament not updated');

  // UPDATE TOURNAMENT ROUNDS
  const updatedRounds = await TournamentRoundsController.update(updatedTournament);

  // UPDATE MATCHES

  return res.status(200).send(updatedRounds);
};

export const API_Dataprovider = {
  setup,
  update,
};
