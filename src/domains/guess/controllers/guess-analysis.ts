import { DB_SelectGuess } from '@/domains/guess/schema';
import { DB_SelectMatch } from '@/domains/match/schema';
import { toNumberOrNull, toNumberOrZero } from '@/utils';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import utc from 'dayjs/plugin/utc';
import { GUESS_STATUS, GUESS_STATUSES } from '../typing';

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

export const runGuessAnalysis = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const hasNullGuesses = guess.homeScore === null || guess.awayScore === null;
  const hasLostTimewindowToGuess = dayjs()
    .utc()
    .isSameOrAfter(dayjs.utc(match.date).toDate());

  const guessPaused = match.status === 'not-defined';
  const guessExpired = hasNullGuesses && hasLostTimewindowToGuess;
  const notStartedGuess = match.status === 'open' && hasNullGuesses;
  const waitingForGame = match.status === 'open' && !hasNullGuesses;

  if (guessPaused) return generatePausedGuess(guess, match, { hasLostTimewindowToGuess });
  if (guessExpired)
    return generateExpiredGuess(guess, match, { hasLostTimewindowToGuess });
  if (notStartedGuess)
    return generateNotStartedGuess(guess, match, { hasLostTimewindowToGuess });
  if (waitingForGame)
    return generateWaitingForGameGuess(guess, match, { hasLostTimewindowToGuess });

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
      value: toNumberOrNull(guess.homeScore),
      points,
    },
    away: {
      status,
      value: toNumberOrNull(guess.awayScore),
      points,
    },
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
  const POINTS_FOR_TEAM = 1;
  const POINTS_FOR_MISS = 0;
  const CORRECT_GUESS = GUESS_STATUSES.CORRECT;
  const INCORRECT_GUESS = GUESS_STATUSES.INCORRECT;
  const hasGuessedHome =
    toNumberOrNull(guess.homeScore) === toNumberOrNull(match.homeScore);
  const hasGuessedAway =
    toNumberOrNull(guess.awayScore) === toNumberOrNull(match.awayScore);

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

  const total = home.points + away.points;

  return {
    id: guess.id,
    matchId: match.id,
    matchDate: match.date,
    home,
    away,
    total,
    status: GUESS_STATUSES.FINALIZED,
    ...options,
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
  total: number | null;
  status: GUESS_STATUS;
  hasLostTimewindowToGuess: boolean;
}
