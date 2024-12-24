import { type Response } from 'express';
import { TournamentController } from '../controller/tournaments';
import { TournamentRequest } from '../interface';
import { MatchDataController } from './matches';
import { TeamsDataController } from './teams';
import { TournamentRoundsController } from './tournament-rounds';

const setup = async (req: TournamentRequest, res: Response) => {
  // SETUP TOURNAMENT
  const newTournament = await TournamentController.setupTournament(req, res);
  if (!newTournament) throw new Error('Tournament not created');

  // SETUP TOURNAMENTS ROUNDS
  const newRounds = await TournamentRoundsController.setup(newTournament);
  if (!newRounds) throw new Error('Tournament rounds not created');

  // SETUP TEAMS
  const teams = await TeamsDataController.setup(newTournament);

  // SETUP MATCHES
  const matches = await MatchDataController.setup(newTournament);

  return res.status(200).send({ teams, matches });
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
