import { TournamentRequest } from '@/domains/data-provider/api/tournament/typing';
import { TournamentController } from '@/domains/data-provider/controllers/tournament/tournament';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { MatchesController } from '../../controllers/matches';
import { StandingsController } from '../../controllers/standings';
import { TeamsController } from '../../controllers/teams';
import { TournamentRoundController } from '../../controllers/tournament-rounds/tournament-round';

const setup = async (req: TournamentRequest, res: Response) => {
  try {
    // SETUP TOURNAMENT
    const newTournament = await TournamentController.createTournament({
      input: req.body,
    });
    if (!newTournament) throw new Error('[ERROR] - [SETUP] - Tournament not created');

    // SETUP TOURNAMENTS ROUNDS
    const newRounds = await TournamentRoundController.create(newTournament.id!);

    // SETUP TEAMS
    const teams = await TeamsController.create(newTournament.id!);

    // SETUP MATCHES
    const matches = await MatchesController.create(newTournament.id!);

    // SETUP STANDINGS
    const standings = await StandingsController.create(newTournament.id!);

    return res.status(200).send('[SETUP COMPLETED]');
  } catch (error: any) {
    handleInternalServerErrorResponse(res, error);
  }
};

const update = async (req: TournamentRequest, res: Response) => {
  try {
    // UPDATE TOURNAMENT
    const updatedTournament = await TournamentController.updateTournament({
      input: req.body,
    });
    if (!updatedTournament) throw new Error('Tournament not updated');

    return res.status(200).send(updatedTournament);
  } catch (error: any) {
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Tournament = {
  setup,
  update,
};
