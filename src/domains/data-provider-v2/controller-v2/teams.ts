// const { fetchStandings } = ApiProviderV2.standings;

import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { ApiProviderV2 } from '..';
import { TeamsRequest } from '../interface';

const { fetchTeamsFromStandings } = ApiProviderV2.teams;

const setupTeams = async (req: TeamsRequest, res: Response) => {
  try {
    const standings = await fetchTeamsFromStandings(req);

    // const mappedTeams = await mapTeamsFromStandings(standings)

    // const query = await createOnDatabase({ ...req.body, logo });

    res.status(200).send(standings);
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

// // const updateTournament = async (req: TournamentRequest, res: Response) => {
// //   try {
// //     const logo = await fetchAndStoreLogo({
// //       logoPngBase64: req.body.logoPngBase64,
// //       logoUrl: req.body.logoUrl,
// //       id: req.body.externalId,
// //     });

// //     const query = await updateOnDatabase({ ...req.body, logo });

// //     res.status(200).send(query);
// //   } catch (error: any) {
// //     console.error('[ERROR] - createTournament', error);

// //     handleInternalServerErrorResponse(res, error);
// //   }
// // };

export const ControllerTeamsProvider = {
  setupTeams,
};
