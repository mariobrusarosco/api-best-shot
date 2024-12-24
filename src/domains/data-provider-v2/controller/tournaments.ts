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

    // // CREATE TOURNAMENT ROUNDS
    // // const schedule = await Scheduler.tournamentUpdateRecurrence(tournament);
    // const rounds = await Api.fetchRounds(tournament.baseUrl);
    // const roundsToInsert = Api.mapRoundsToInsert(rounds, tournament.id!);
    // const roundsInserted = await Api.createRoundsOnDatabase(roundsToInsert);

    // console.log('ROUNDS', roundsInserted);

    // // TEAMS CREATION
    // const teams = await TeamsDataController.setupTeams(tournament.id!);

    // // CREATE TOURNAMENT STANDINGS
    // if (tournament.mode === 'regular-season-only') {
    //   const standings = await StandingsDataController.setupStandings(
    //     tournament.baseUrl,
    //     tournament.id!
    //   );

    //   console.log('CREATED STANDINGS', standings);
    // }

    // CREATE TOURNAMENT MATCHES
    // if (tournament.mode === 'regular-season-only') {
    //   const standings = await MatchesDataController.setupMatches(
    //     tournament.baseUrl,
    //     tournament.id!
    //   );

    //   console.log('CREATED STANDINGS', standings);
    // }

    return tournament;
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

    // UPDATE TOURNAMENT ROUNDS
    const rounds = await Api.fetchRounds(tournament.baseUrl);
    const roundsToUpdate = Api.mapRoundsToInsert(rounds, tournament.id!);
    const roundsUpdated = await Api.updateRoundsOnDatabase(roundsToUpdate);

    // UPDATE TOURNAMENT STANDINGS

    // UPDATE TOURNAMENT MATCHES

    res.status(200).send(roundsUpdated);
  } catch (error: any) {
    console.error('[ERROR] - updateTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TournamentController = {
  setupTournament,
  updateTournament,
};
