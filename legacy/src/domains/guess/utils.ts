import { runGuessAnalysis } from './controllers/guess-analysis';

const getTotalPoints = (guesses?: ReturnType<typeof runGuessAnalysis>[]) => {
  if (!performance) return null;

  return guesses?.reduce((acc, value) => acc + value.total, 0);
};

export const GuessUtils = {
  getTotalPoints,
};
