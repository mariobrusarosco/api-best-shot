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

import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { DB_InsertGuess, T_Guess } from '@/domains/guess/schema';
import db from '@/services/database';
import { QUERIES_TOURNAMENT } from '../queries';

import type { ITournamentStadingsMode } from '@/domains/tournament/typing';
import { DB_InsertTournament } from '../schema';
import { parseStandingsByMode } from '../utils/standing-mode-mapper';

const getAllTournaments = async () => {
  return QUERIES_TOURNAMENT.allTournaments();
};

const getTournamentScore = async (memberId: string, tournamentId: string) => {
  const guesses = await QUERIES_TOURNAMENT.getTournamentGuesses(memberId, tournamentId);
  const parsedGuesses = guesses.map((row: (typeof guesses)[number]) => runGuessAnalysis(row.guess, row.match));

  return {
    details: parsedGuesses,
    points: getTotalPoints(parsedGuesses),
  };
};

const getTotalPoints = (guesses?: ReturnType<typeof runGuessAnalysis>[]) => {
  if (!guesses) return null;
  return guesses.reduce((acc, value) => acc + value.total, 0);
};

const setupTournament = async (memberId: string, tournamentId: string) => {
  const matches = await QUERIES_TOURNAMENT.getTournamentMatches(tournamentId);

  const guessesToInsert = matches.map(
    (match: (typeof matches)[number]) =>
      ({
        matchId: match.id,
        memberId,
        awayScore: null,
        homeScore: null,
      }) satisfies DB_InsertGuess
  );

  await db.insert(T_Guess).values(guessesToInsert);

  return true;
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

const createTournament = async (payload: DB_InsertTournament) => {
  return QUERIES_TOURNAMENT.createTournament(payload);
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
  getTournamentScore,
  setupTournament,

  getMatchesWithNullGuess,
  getTournamentDetails,
  getKnockoutRounds,
  checkOnboardingStatus,
  getTournamentStandings,
  getTournament,
  createTournament,
  getTournamentRounds,
};
