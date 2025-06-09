import { Request, Response } from 'express';
import { SERVICES_PERFORMANCE } from '../services';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { Utils } from '@/domains/auth/utils';

const updateTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { tournamentId } = req.params;
    const { points } = req.body;

    await SERVICES_PERFORMANCE.updateTournamentPerformance(
      memberId,
      tournamentId,
      points
    );
    return res.status(200).send('SUCCESS');
  } catch (error: unknown) {
    console.error('[PERFORMANCE - updateTournamentPerformance]', error);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

export const API_PERFORMANCE = {
  updateTournamentPerformance,
};
