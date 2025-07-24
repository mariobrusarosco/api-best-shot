/**
 * Tournament Round Domain Services
 *
 * Services are the core logic handlers for the Tournament Round domain.
 * They follow these principles:
 *
 * Responsibilities:
 * - Receive data as input
 * - Process/transform the data
 * - Return processed data as output
 *
 * Integration Points:
 * - Can call Queries (database operations)
 * - Can be called by APIs (endpoint handlers)
 * - Can use Utils (shared functionality)
 * - Can call other Services (cross-domain operations)
 *
 * Architecture Rules:
 * - Services don't know implementation details of their dependencies
 * - Services focus only on business logic
 * - Services maintain separation of concerns
 *
 * Naming Convention:
 * - Export single object named SERVICES_TOURNAMENT_ROUND
 * - All public functionality must be methods of this object
 * - No other exports allowed from this file
 */

import { QUERIES_TOURNAMENT_ROUND } from '../queries';
import type { DB_InsertTournamentRound } from '../schema';

const getAllRounds = async (tournamentId: string) => {
  return QUERIES_TOURNAMENT_ROUND.getAllRounds(tournamentId);
};

const getRound = async (tournamentId: string, roundSlug: string) => {
  const round = await QUERIES_TOURNAMENT_ROUND.getRound(tournamentId, roundSlug);
  
  if (!round) {
    throw new Error('Tournament round not found');
  }
  
  return round;
};

const getRegularSeasonRounds = async (tournamentId: string) => {
  return QUERIES_TOURNAMENT_ROUND.getRegularSeasonRounds(tournamentId);
};

const getKnockoutRounds = async (tournamentId: string) => {
  return QUERIES_TOURNAMENT_ROUND.getKnockoutRounds(tournamentId);
};

const createTournamentRound = async (roundData: DB_InsertTournamentRound) => {
  // Validate required fields
  if (!roundData.tournamentId || !roundData.label || !roundData.slug) {
    throw new Error('Missing required tournament round data');
  }

  return QUERIES_TOURNAMENT_ROUND.createTournamentRound(roundData);
};

const createMultipleTournamentRounds = async (roundsData: DB_InsertTournamentRound[]) => {
  if (!roundsData.length) {
    throw new Error('No tournament rounds data provided');
  }

  // Validate all rounds have required fields
  for (const round of roundsData) {
    if (!round.tournamentId || !round.label || !round.slug) {
      throw new Error('Missing required tournament round data');
    }
  }

  return QUERIES_TOURNAMENT_ROUND.createMultipleTournamentRounds(roundsData);
};

export const SERVICES_TOURNAMENT_ROUND = {
  getAllRounds,
  getRound,
  getRegularSeasonRounds,
  getKnockoutRounds,
  createTournamentRound,
  createMultipleTournamentRounds,
};
