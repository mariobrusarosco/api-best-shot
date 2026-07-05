import { DB_SelectGuess } from '@/domains/guess/schema';
import { DB_SelectMatch } from '@/domains/match/schema';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import utc from 'dayjs/plugin/utc';
import { GUESS_STATUS, GUESS_STATUSES } from '../typing';

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

export const runGuessAnalysis = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const hasNullGuesses = guess.homeScore === null || guess.awayScore === null;
  const hasLostTimewindowToGuess = dayjs().utc().isSameOrAfter(dayjs.utc(match.date).toDate());

  const guessPaused = match.status === 'not-defined';
  const guessExpired = hasNullGuesses && hasLostTimewindowToGuess;
  const notStartedGuess = match.status === 'open' && hasNullGuesses;
  const waitingForGame = match.status === 'open' && !hasNullGuesses;

  if (guessPaused) return generatePausedGuess(guess, match, { hasLostTimewindowToGuess });
  if (guessExpired) return generateExpiredGuess(guess, match, { hasLostTimewindowToGuess });
  if (notStartedGuess) return generateNotStartedGuess(guess, match, { hasLostTimewindowToGuess });
  if (waitingForGame) return generateWaitingForGameGuess(guess, match, { hasLostTimewindowToGuess });

  return generateFinalizedGuess(guess, match, { hasLostTimewindowToGuess });
};

const generateExpiredGuess = (
  guess: DB_SelectGuess,
  match: DB_SelectMatch,
  options: {
    hasLostTimewindowToGuess: boolean;
  }
) => {
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
    fullMatch: { status, points, label: '' },
    status: status,
    total: 0,
    ...options,
  } satisfies IGuessAnalysis;
};

const generatePausedGuess = (
  guess: DB_SelectGuess,
  match: DB_SelectMatch,
  options: {
    hasLostTimewindowToGuess: boolean;
  }
) => {
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
    fullMatch: { status, points, label: '' },
    total: 0,
    status: status,
    ...options,
  } satisfies IGuessAnalysis;
};

const generateNotStartedGuess = (
  guess: DB_SelectGuess,
  match: DB_SelectMatch,
  options: {
    hasLostTimewindowToGuess: boolean;
  }
) => {
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
    fullMatch: { status, points, label: '' },
    total: 0,
    status: status,
    ...options,
  } satisfies IGuessAnalysis;
};

const generateWaitingForGameGuess = (
  guess: DB_SelectGuess,
  match: DB_SelectMatch,
  options: {
    hasLostTimewindowToGuess: boolean;
  }
) => {
  const status = GUESS_STATUSES.WAITING_FOR_GAME;
  const points = null;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home: {
      status,
      value: guess.homeScore,
      points,
    },
    away: {
      status,
      value: guess.awayScore,
      points,
    },
    fullMatch: { status, points, label: '' },
    total: 0,
    status,
    ...options,
  } satisfies IGuessAnalysis;
};

const generateFinalizedGuess = (
  guess: DB_SelectGuess,
  match: DB_SelectMatch,
  options: {
    hasLostTimewindowToGuess: boolean;
  }
) => {
  const POINTS_FOR_TEAM = 0;
  const POINTS_FOR_MISS = 0;
  const CORRECT_GUESS = GUESS_STATUSES.CORRECT;
  const INCORRECT_GUESS = GUESS_STATUSES.INCORRECT;
  const hasGuessedHome = guess.homeScore === match.homeScore;
  const hasGuessedAway = guess.awayScore === match.awayScore;
  const matchOutcome = getMatchOutcome(guess, match);

  const home = {
    status: hasGuessedHome ? CORRECT_GUESS : INCORRECT_GUESS,
    value: guess.homeScore,
    points: hasGuessedHome ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  const away = {
    status: hasGuessedAway ? CORRECT_GUESS : INCORRECT_GUESS,
    value: guess.awayScore,
    points: hasGuessedAway ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  const total = home.points + away.points + matchOutcome.points;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home,
    away,
    total,
    fullMatch: matchOutcome,
    status: GUESS_STATUSES.FINALIZED,
    ...options,
  } satisfies IGuessAnalysis;
};

const getMatchOutcome = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const POINTS_FOR_MATCH_OUTCOME = 3;
  let guessPrediction = null;
  let matchOutcome = null;
  const homeGuess = guess.homeScore ?? 0;
  const homeMatch = match.homeScore ?? 0;
  const awayGuess = guess.awayScore ?? 0;
  const awayMatch = match.awayScore ?? 0;

  if (homeGuess > awayGuess) guessPrediction = { label: `HOME_WIN` };
  else if (homeGuess < awayGuess) guessPrediction = { label: 'AWAY_WIN' };
  else guessPrediction = { label: 'DRAW' };

  if (homeMatch > awayMatch) matchOutcome = { label: `HOME_WIN` };
  else if (homeMatch < awayMatch) matchOutcome = { label: 'AWAY_WIN' };
  else matchOutcome = { label: 'DRAW' };

  console.log(
    { homeGuess, homeMatch, awayGuess, awayMatch, matchOutcome, guessPrediction },
    guessPrediction.label === matchOutcome.label ? GUESS_STATUSES.CORRECT : GUESS_STATUSES.INCORRECT
  );

  return {
    label: matchOutcome.label,
    points: guessPrediction.label === matchOutcome.label ? POINTS_FOR_MATCH_OUTCOME : 0,
    status: guessPrediction.label === matchOutcome.label ? GUESS_STATUSES.CORRECT : GUESS_STATUSES.INCORRECT,
  };
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
    label: string;
    points: number | null;
  };
  total: number | null;
  status: GUESS_STATUS;
  hasLostTimewindowToGuess: boolean;
}
