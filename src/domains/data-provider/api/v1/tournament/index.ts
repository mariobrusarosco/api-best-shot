import { TournamentController } from '@/domains/data-provider/controllers/tournament/tournament';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { TournamentRoundController } from '../../../controllers/tournament-rounds/tournament-round';
import { TournamentRequest } from '@/domains/tournament/typing';

const setup = async (req: TournamentRequest, res: Response) => {
  try {
    let tournament;
    let rounds;

    try {
      // SETUP TOURNAMENT
      tournament = await TournamentController.createTournament({
        input: req.body,
      });
      Profiling.log({
        msg: '[SETUP 1] - CREATE TOURNAMENT - SUCCESS',
        data: { tournament },
        source: 'DATA_PROVIDER_TOURNAMENT_setup',
      });
    } catch (error: unknown) {
      Profiling.error({
        source: 'DATA_PROVIDER_TOURNAMENT_setup',
        error: error as Error,
      });
    }

    if (!tournament) throw new Error('[ERROR] - [DATA PROVIDER] - [SETUP] - Tournament not created');

    try {
      // SETUP TOURNAMENTS ROUNDS
      rounds = await TournamentRoundController.create(tournament.id!);
      Profiling.log({
        msg: '[SETUP 2] - CREATE ROUNDS - SUCCESS',
        data: { rounds },
        source: 'DATA_PROVIDER_TOURNAMENT_setup',
      });
    } catch (error: unknown) {
      Profiling.error({
        source: 'DATA_PROVIDER_TOURNAMENT_setup',
        error: error as Error,
      });
    }

    // try {
    //   // SETUP TEAMS
    //   teams = await TeamsController.create(tournament.id!);
    //   Profiling.log('[DATA PROVIDER] - [SETUP 3] - [CREATE TEAMS] - [SUCCESS]', {
    //     teams,
    //   });
    // } catch (error: unknown) {
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
  } catch (error: unknown) {
    handleInternalServerErrorResponse(res, error as Error);
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
  } catch (error: unknown) {
    handleInternalServerErrorResponse(res, error as Error);
  }
};

export const API_TOURNAMENT = {
  setup,
  update,
};
