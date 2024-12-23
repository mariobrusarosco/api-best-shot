import { TournamentRequest } from '@/domains/data-provider-v2/interface';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';
import { SofascoreTournament } from '../providers/sofascore/sofascore-tournament';

const Api = SofascoreTournament;

const setupTournament = async (req: TournamentRequest, res: Response) => {
  try {
    // TOURNAMENT CREATION
    const logo = await Api.fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      filename: `tournament-${req.body.provider}-${req.body.externalId}`,
    });
    const tournament = await Api.createOnDatabase({ ...req.body, logo });
    if (!tournament) throw new Error('Tournament not created');

    // ROUNDS CREATION
    // const schedule = await handleTournamentRecurrence(tournament);

    // Fetch Rounds
    const rounds = await Api.fetchRounds(tournament.roundsUrl);
    // Insert rounds on database
    const roundsToInsert = Api.mapRoundsToInsert(rounds, tournament.id!);
    const roundsInserted = await Api.createRoundsOnDatabase(roundsToInsert);

    console.log('ROUNDS', roundsInserted);
    // TEAMS CREATON
    // const teams = await TeamsDataController.setupTeams(tournament.id!);

    // ROUNDS CREATION

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTournament = async (req: TournamentRequest, res: Response) => {
  try {
    // const logo = await Api.fetchAndStoreLogo({
    //   logoPngBase64: req.body.logoPngBase64,
    //   logoUrl: req.body.logoUrl,
    //   filename: `tournament-${req.body.provider}-${req.body.externalId}`,
    // });

    const tournament = await Api.updateOnDatabase({ ...req.body });
    console.log('TOURNAMENT', tournament);

    // UPDATE TOURNAMENT ROUNDS
    // Fetch Rounds
    const rounds = await Api.fetchRounds(tournament.roundsUrl);
    // Insert rounds on database
    const roundsToUpdate = Api.mapRoundsToInsert(rounds, tournament.id!);
    const roundsInserted = await Api.updateRoundsOnDatabase(roundsToUpdate);

    // UPDATE TOURNAMENT STANDINGS

    res.status(200).send(roundsInserted);
  } catch (error: any) {
    console.error('[ERROR] - updateTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TournamentDataController = {
  setupTournament,
  updateTournament,
};
