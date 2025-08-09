import type { Request, Response } from 'express';
import { SERVICES_TOURNAMENT_ROUND } from '../services';
import type { DB_InsertTournamentRound } from '../schema';

const getAllRounds = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required',
      });
    }

    const rounds = await SERVICES_TOURNAMENT_ROUND.getAllRounds(tournamentId);

    return res.status(200).json({
      success: true,
      data: rounds,
    });
  } catch (error) {
    console.error('[API_TOURNAMENT_ROUND] - [getAllRounds]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament rounds',
    });
  }
};

const getRound = async (req: Request, res: Response) => {
  try {
    const { tournamentId, roundSlug } = req.params;

    if (!tournamentId || !roundSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID and round slug are required',
      });
    }

    const round = await SERVICES_TOURNAMENT_ROUND.getRound(tournamentId, roundSlug);

    return res.status(200).json({
      success: true,
      data: round,
    });
  } catch (error) {
    console.error('[API_TOURNAMENT_ROUND] - [getRound]', error);

    if (error instanceof Error && error.message === 'Tournament round not found') {
      return res.status(404).json({
        success: false,
        error: 'Tournament round not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament round',
    });
  }
};

const getKnockoutRounds = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required',
      });
    }

    const rounds = await SERVICES_TOURNAMENT_ROUND.getKnockoutRounds(tournamentId);

    return res.status(200).json({
      success: true,
      data: rounds,
    });
  } catch (error) {
    console.error('[API_TOURNAMENT_ROUND] - [getKnockoutRounds]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch knockout rounds',
    });
  }
};

const createTournamentRound = async (req: Request, res: Response) => {
  try {
    const roundData: DB_InsertTournamentRound = req.body;

    const round = await SERVICES_TOURNAMENT_ROUND.createTournamentRound(roundData);

    return res.status(201).json({
      success: true,
      data: round,
    });
  } catch (error) {
    console.error('[API_TOURNAMENT_ROUND] - [createTournamentRound]', error);

    if (error instanceof Error && error.message.includes('Missing required')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create tournament round',
    });
  }
};

const createMultipleTournamentRounds = async (req: Request, res: Response) => {
  try {
    const roundsData: DB_InsertTournamentRound[] = req.body;

    const rounds =
      await SERVICES_TOURNAMENT_ROUND.createMultipleTournamentRounds(roundsData);

    return res.status(201).json({
      success: true,
      data: rounds,
    });
  } catch (error) {
    console.error('[API_TOURNAMENT_ROUND] - [createMultipleTournamentRounds]', error);

    if (
      error instanceof Error &&
      (error.message.includes('Missing required') ||
        error.message.includes('No tournament rounds data'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create tournament rounds',
    });
  }
};

export const API_TOURNAMENT_ROUND = {
  getAllRounds,
  getRound,
  getKnockoutRounds,
  createTournamentRound,
  createMultipleTournamentRounds,
};
