import { TournamentRequest } from '@/domains/data-provider/api/typying/tournament';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { TournamentController } from '../../data-provider-v2/controller/tournaments';

const setup = async (req: TournamentRequest, res: Response) => {
  try {
    // SETUP TOURNAMENT
    const newTournament = await TournamentController.createTournament({
      input: req.body,
    });
    if (!newTournament) throw new Error('Tournament not created');

    // // SETUP TOURNAMENTS ROUNDS
    // const newRounds = await TournamentRoundsController.setup(newTournament);
    // if (!newRounds) throw new Error('Tournament rounds not created');

    // // SETUP TEAMS
    // const teams = await TeamsDataController.setup(newTournament);

    // // SETUP MATCHES
    // const matches = await MatchDataController.setup(newTournament);

    // // SETUP STANDINGS

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('[ERROR] - [API_Tournament] - setup', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Tournament = {
  setup,
};
