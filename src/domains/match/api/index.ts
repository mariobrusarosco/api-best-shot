import { Request, Response } from 'express';
import { SERVICES_MATCH } from '../services';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';

const getMatchesByTournament = async (req: Request, res: Response) => {
  try {
    const { tournamentId, roundId } = req.params;
    const matches = await SERVICES_MATCH.getMatchesByTournament(tournamentId, roundId);
    return res.status(200).send(matches);
  } catch (error: any) {
    console.error('[MATCH - getMatchesByTournament]', error);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

export const API_MATCH = {
  getMatchesByTournament,
};
