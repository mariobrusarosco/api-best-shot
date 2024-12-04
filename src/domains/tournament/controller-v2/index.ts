import { TournamentRequest } from '@/domains/data-provider-v2/interface';
import { type Response } from 'express';

const createTournament = async (req: TournamentRequest, res: Response) => {
  const { roundsUrl, standingsUrl } = req.body;

  res.status(200).send({ roundsUrl, standingsUrl });
};

export const TournamentControllerv2 = {
  createTournament,
};
