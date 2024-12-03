import { DB_SelectGuess } from '@/domains/guess/schema';
import { DB_SelectMatch } from '@/domains/match/schema';
import { toNumberOrNull, toNumberOrZero } from '@/utils';

export const runGuessAnalysis = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const endedMatch = match.status === 'ended';
  const openMatch = match.status === 'open';
  const hasNullGuesses = guess.homeScore === null || guess.awayScore === null;
  const guessExpired = endedMatch && hasNullGuesses;

  if (guessExpired) return generateExpiredGuess(guess);
  if (openMatch) return generateOpenGuess(guess);

  return generateFinalizedGuess(guess, match);
};

const generateExpiredGuess = (guess: DB_SelectGuess) => {
  const guessOutcome = 'expired';
  const points = null;
  const value = null;

  return {
    id: guess.id,
    matchId: guess.matchId,
    home: {
      guessOutcome,
      value,
      points,
    },
    away: {
      guessOutcome,
      value,
      points,
    },
    fullMatch: { guessOutcome, points },
    total: 0,
  } satisfies IGuessAnalysis;
};

const generateOpenGuess = (guess: DB_SelectGuess) => {
  const guessOutcome = 'waiting_for_score';
  const points = null;

  return {
    id: guess.id,
    matchId: guess.matchId,
    home: {
      guessOutcome,
      value: toNumberOrNull(guess.homeScore),
      points,
    },
    away: {
      guessOutcome,
      value: toNumberOrNull(guess.awayScore),
      points,
    },
    fullMatch: { guessOutcome, points },
    total: 0,
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
  const CORRECT_GUESS = 'correct_guess';
  const INCORRECT_GUESS = 'incorrect_guess';
  const hasGuessedHome =
    toNumberOrNull(guess.homeScore) === toNumberOrNull(match.homeScore);
  const hasGuessedAway =
    toNumberOrNull(guess.awayScore) === toNumberOrNull(match.awayScore);
  const matchOutcome = hasGuessedMatchOutcome(guess, match);

  const home = {
    guessOutcome: hasGuessedHome ? CORRECT_GUESS : INCORRECT_GUESS,
    value: toNumberOrNull(guess.homeScore),
    points: hasGuessedHome ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  const away = {
    guessOutcome: hasGuessedAway ? CORRECT_GUESS : INCORRECT_GUESS,
    value: toNumberOrNull(guess.awayScore),
    points: hasGuessedAway ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  const fullMatch = {
    guessOutcome: matchOutcome ? CORRECT_GUESS : INCORRECT_GUESS,
    points: matchOutcome ? POINTS_FOR_MATCH : POINTS_FOR_MISS,
  };

  const total = home.points + away.points + fullMatch.points;

  return {
    id: guess.id,
    matchId: guess.matchId,
    home,
    away,
    fullMatch,
    total,
  } satisfies IGuessAnalysis;
};

interface IGuessAnalysis {
  id: string;
  matchId: string;
  home: {
    guessOutcome: string;
    value: number | null;
    points: number | null;
  };
  away: { guessOutcome: string; value: number | null; points: number | null };
  fullMatch: {
    guessOutcome: string;
    points: number | null;
  };
  total: number | null;
}
