import { TournamentRequest } from '@/domains/data-provider/api/v1/tournament/typing';
import { TournamentController } from '@/domains/data-provider/controllers/tournament/tournament';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { MatchesController } from '../../../controllers/matches';
import { StandingsController } from '../../../controllers/standings';
import { TeamsController } from '../../../controllers/teams';
import { TournamentRoundController } from '../../../controllers/tournament-rounds/tournament-round';

const setup = async (req: TournamentRequest, res: Response) => {
  try {
    let tournament;
    let rounds;
    let teams;
    let matches;
    let standings;

    try {
      // SETUP TOURNAMENT
      tournament = await TournamentController.createTournament({
        input: req.body,
      });  
      Profiling.log({
        msg: '[DATA PROVIDER] - [SETUP 1]- [CREATE TOURNAMENT] - [SUCCESS]',
        data: { tournament },
        color: 'FgGreen'
      });
    } catch (error: any) {
      Profiling.error('[DATA PROVIDER] - [SETUP 1]- [CREATE TOURNAMENT] - [ERROR]', { error });
    }

    if (!tournament)
      throw new Error('[ERROR] - [DATA PROVIDER] - [SETUP] - Tournament not created');

    try {   
      // SETUP TOURNAMENTS ROUNDS
      rounds = await TournamentRoundController.create(tournament.id!);
      Profiling.log({
        msg: '[DATA PROVIDER] - [SETUP 2] - [CREATE ROUNDS] - [SUCCESS]',
        data: { rounds },
        color: 'FgGreen'
      });
    } catch (error: any) {
      Profiling.error('[DATA PROVIDER] - [SETUP 2] - [CREATE ROUNDS] - [ERROR]', { error });
    }

    // try {
    //   // SETUP TEAMS
    //   teams = await TeamsController.create(tournament.id!);
    //   Profiling.log('[DATA PROVIDER] - [SETUP 3] - [CREATE TEAMS] - [SUCCESS]', {
    //     teams,
    //   });
    // } catch (error: any) {
    //   Profiling.error('[DATA PROVIDER] - [SETUP 3] - [CREATE TEAMS] - [ERROR]', { error });
    // }

      
    // SETUP MATCHES
    // matches = await MatchesController.create(tournament.id!);
    // Profiling.log('[DATA PROVIDER] - [SETUP 4] - [CREATE MATCHES] - [SUCCESS]', {
    //   matches,
    // });

    // SETUP STANDINGS
    // standings = await StandingsController.create(tournament.id!);
    // Profiling.log('[DATA PROVIDER] - [SETUP 5] - [CREATE STANDINGS] - [SUCCESS]', {
    //   standings,
    // });

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

export const API_TOURNAMENT = {
  setup,
  update,
};
