/**
 * Tournament Domain Services
 *
 * Services are the core logic handlers for the Tournament domain.
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
 * - Export single object named SERVICES_TOURNAMENT
 * - All public functionality must be methods of this object
 * - No other exports allowed from this file
 */

import { QUERIES_MATCH } from '@/domains/match/queries';
import { SCOREBOARD_OPERATION_TYPES } from '@/domains/scoreboard/contracts';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import type { ITournamentStadingsMode, TournamentMode } from '@/domains/tournament/typing';
import { QUERIES_TOURNAMENT } from '../queries';
import { DB_InsertTournament } from '../schema';
import { parseStandingsByMode } from '../utils/standing-mode-mapper';

const getAllTournaments = async () => {
  return QUERIES_TOURNAMENT.allTournaments();
};

const listActiveTournamentsByModes = async (modes: TournamentMode[]) => {
  return QUERIES_TOURNAMENT.listActiveTournamentsByModes(modes);
};

const getTournamentScore = async (memberId: string, tournamentId: string) => {
  const points = await QUERIES_TOURNAMENT.getMemberTournamentScoreboardPoints(memberId, tournamentId);
  const [hasMatchesAwaitingScoreboardCalculation, hasInProgressScoreboardExecution] = await Promise.all([
    QUERIES_MATCH.hasMatchesAwaitingScoreboardCalculation({ tournamentId }),
    QUERIES_SCOREBOARD.hasInProgressExecution({
      tournamentId,
      operationType: SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT,
    }),
  ]);

  return {
    points,
    underCalculation: hasMatchesAwaitingScoreboardCalculation || hasInProgressScoreboardExecution,
  };
};

const getMatchesWithNullGuess = async (memberId: string, tournamentId: string, round: string) => {
  return QUERIES_TOURNAMENT.getMatchesWithNullGuess(memberId, tournamentId, round);
};

const getTournamentDetails = async (tournamentId: string) => {
  return QUERIES_TOURNAMENT.tournament(tournamentId);
};

const getKnockoutRounds = async (tournamentId: string) => {
  return QUERIES_TOURNAMENT.knockoutRounds(tournamentId);
};

const checkOnboardingStatus = async (memberId: string, tournamentId: string) => {
  const guesses = await QUERIES_TOURNAMENT.getTournamentGuesses(memberId, tournamentId);
  return guesses.length > 0;
};

const getTournamentStandings = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const standings = await QUERIES_TOURNAMENT.getTournamentStandings(tournamentId);
  const parsedStandings = await parseStandingsByMode(standings, tournament.standingsMode as ITournamentStadingsMode);

  return parsedStandings;
};

const getTournament = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);

  if (!tournament) {
    throw new Error('Tournament not found');
  }
  return tournament;
};

const getTournamentRecord = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournamentRecord(tournamentId);

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  return tournament;
};

const createTournament = async (payload: DB_InsertTournament) => {
  return QUERIES_TOURNAMENT.createTournament(payload);
};

const deleteTournament = async (tournamentId: string) => {
  return QUERIES_TOURNAMENT.deleteTournamentAggregate(tournamentId);
};

const getTournamentRounds = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  return tournament.rounds;
};

export const SERVICES_TOURNAMENT = {
  getAllTournaments,
  listActiveTournamentsByModes,
  getTournamentScore,
  getMatchesWithNullGuess,
  getTournamentDetails,
  getKnockoutRounds,
  checkOnboardingStatus,
  getTournamentStandings,
  getTournament,
  getTournamentRecord,
  createTournament,
  deleteTournament,
  getTournamentRounds,
};
