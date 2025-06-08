import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';

export const getTotalPointsFromTournamentGuesses = (
  guesses?: ReturnType<typeof runGuessAnalysis>[]
) => {
  if (!performance) return null;

  return guesses?.reduce((acc, value) => acc + value.total, 0);
};
