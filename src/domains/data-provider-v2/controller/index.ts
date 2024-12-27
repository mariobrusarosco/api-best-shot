// @ts-nocheck
import { type Response } from 'express';
import { TournamentRequest } from '../../data-provider/typying/main-interface';
import { TournamentController } from '../controller/tournaments';
import { StandingsDataController } from './standings';
import { TournamentRoundsController } from './tournament-rounds';

const update = async (req: TournamentRequest, res: Response) => {
  // UPDATE TOURNAMENT
  const updatedTournament = await TournamentController.updateTournament(req, res);
  if (!updatedTournament) throw new Error('Tournament not updated');

  // UPDATE TOURNAMENT ROUNDS
  const updatedRounds = await TournamentRoundsController.update(updatedTournament);

  // UPDATE MATCHES

  // UPDATE STANDINGS
  const standings = await StandingsDataController.updateStandings(
    updatedTournament.baseUrl,
    updatedTournament.id!
  );

  return res.status(200).send('test');
};

export const API_Dataprovider = {
  update,
};
