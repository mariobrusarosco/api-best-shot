import { DB_SelectGuess } from '@/domains/guess/schema';
import { DB_SelectMatch } from '@/domains/match/schema';
import { toNumberOrNull, toNumberOrZero } from '@/utils';
import { isPast } from 'date-fns';
import { GUESS_STATUS, GUESS_STATUSES } from '../typing';

export const runGuessAnalysis = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const hasNullGuesses = guess.homeScore === null || guess.awayScore === null;
  const hasLostTimeWindowToGuess = isPast(match.date || '') && match.status !== 'paused';
  const guessPaused = match.status === 'not-defined';
  const guessExpired = hasNullGuesses && hasLostTimeWindowToGuess;
  const notStartedGuess = match.status === 'open' && hasNullGuesses;
  const waitingForGame = match.status === 'open' && !hasNullGuesses;

  if (guessPaused) return generatePausedGuess(guess, match);
  if (guessExpired) return generateExpiredGuess(guess, match);
  if (notStartedGuess) return generateNotStartedGuess(guess, match);
  if (waitingForGame) return generateWaitingForGameGuess(guess, match);

  return generateFinalizedGuess(guess, match);
};

const generateExpiredGuess = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const status = GUESS_STATUSES.EXPIRED;
  const points = null;
  const value = null;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home: {
      status,
      value,
      points,
    },
    away: {
      status,
      value,
      points,
    },
    fullMatch: { status, points },
    status: status,
    total: 0,
  } satisfies IGuessAnalysis;
};

const generatePausedGuess = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const status = GUESS_STATUSES.PAUSED;
  const points = null;
  const value = null;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home: {
      status,
      value,
      points,
    },
    away: {
      status,
      value,
      points,
    },
    fullMatch: { status, points },
    total: 0,
    status: status,
  } satisfies IGuessAnalysis;
};

const generateNotStartedGuess = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const status = GUESS_STATUSES.NOT_STARTED;
  const points = null;
  const value = null;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home: {
      status,
      value,
      points,
    },
    away: {
      status,
      value,
      points,
    },
    fullMatch: { status, points },
    total: 0,
    status: status,
  } satisfies IGuessAnalysis;
};

const generateWaitingForGameGuess = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const homeGuessScore = guess.homeScore !== null;
  const awayGuessScore = guess.awayScore !== null;
  const mainStatus =
    homeGuessScore && homeGuessScore
      ? GUESS_STATUSES.WAITING_FOR_GAME
      : GUESS_STATUSES.NOT_STARTED;
  const points = null;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home: {
      status: homeGuessScore
        ? GUESS_STATUSES.WAITING_FOR_GAME
        : GUESS_STATUSES.NOT_STARTED,
      value: toNumberOrNull(guess.homeScore),
      points,
    },
    away: {
      status: awayGuessScore
        ? GUESS_STATUSES.WAITING_FOR_GAME
        : GUESS_STATUSES.NOT_STARTED,
      value: toNumberOrNull(guess.awayScore),
      points,
    },
    fullMatch: { status: mainStatus, points },
    total: 0,
    status: mainStatus,
  } satisfies IGuessAnalysis;
};

const hasGuessedMatchOutcome = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  let guessPrediction = null;
  let matchOutcome = null;
  const homeGuess = toNumberOrZero(guess.homeScore);
  const homeMatch = toNumberOrZero(match.homeScore);
  const awayGuess = toNumberOrZero(guess.awayScore);
  const awayMatch = toNumberOrZero(match.awayScore);

  if (homeGuess > awayGuess) guessPrediction = 'HOME_WIN';
  else if (homeGuess < homeGuess) guessPrediction = 'AWAY_WIN';
  else guessPrediction = 'DRAW';

  if (homeMatch > awayMatch) matchOutcome = 'HOME_WIN';
  else if (homeMatch < awayMatch) matchOutcome = 'AWAY_WIN';
  else matchOutcome = 'DRAW';

  return guessPrediction === matchOutcome;
};

const generateFinalizedGuess = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const POINTS_FOR_MATCH = 2;
  const POINTS_FOR_TEAM = 1;
  const POINTS_FOR_MISS = 0;
  const CORRECT_GUESS = GUESS_STATUSES.CORRECT;
  const INCORRECT_GUESS = GUESS_STATUSES.INCORRECT;
  const hasGuessedHome =
    toNumberOrNull(guess.homeScore) === toNumberOrNull(match.homeScore);
  const hasGuessedAway =
    toNumberOrNull(guess.awayScore) === toNumberOrNull(match.awayScore);
  const matchOutcome = hasGuessedMatchOutcome(guess, match);

  const home = {
    status: hasGuessedHome ? CORRECT_GUESS : INCORRECT_GUESS,
    value: toNumberOrNull(guess.homeScore),
    points: hasGuessedHome ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  const away = {
    status: hasGuessedAway ? CORRECT_GUESS : INCORRECT_GUESS,
    value: toNumberOrNull(guess.awayScore),
    points: hasGuessedAway ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  const fullMatch = {
    status: matchOutcome ? CORRECT_GUESS : INCORRECT_GUESS,
    points: matchOutcome ? POINTS_FOR_MATCH : POINTS_FOR_MISS,
  };

  const total = home.points + away.points + fullMatch.points;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home,
    away,
    fullMatch,
    total,
    status: GUESS_STATUSES.FINALIZED,
  } satisfies IGuessAnalysis;
};

interface IGuessAnalysis {
  id: string;
  matchId: string;
  matchDate: Date | null;
  home: {
    status: GUESS_STATUS;
    value: number | null;
    points: number | null;
  };
  away: {
    status: GUESS_STATUS;
    value: number | null;
    points: number | null;
  };
  fullMatch: {
    status: GUESS_STATUS;
    points: number | null;
  };
  total: number | null;
  status: GUESS_STATUS;
}
