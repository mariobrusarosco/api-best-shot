import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import type { TournamentRequest } from './typing';
import { TournamentDataProviderService } from '@/domains/data-provider/services/tournaments';
import { Response } from 'express';
import Profiling from '@/services/profiling';

const create = async (req: TournamentRequest, res: Response) => {
  try {
    const dataProviderService = new TournamentDataProviderService();
    const tournament = await dataProviderService.init(req.body);

    if (!tournament) {
      return res.status(400).json({
        error: 'Failed to create tournament',
        message: 'Tournament creation failed',
      });
    }

    Profiling.log('[DATA PROVIDER] - [V2] - [TOURNAMENT] - CREATE SUCCESS', {
      tournament,
    });

    return res.status(200).json({ tournament });
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER] - [V2] - [TOURNAMENT] - CREATE FAILED', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const API_TOURNAMENT = {
  create,
};

export default API_TOURNAMENT;
