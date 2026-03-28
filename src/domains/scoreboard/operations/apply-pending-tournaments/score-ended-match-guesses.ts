import { QUERIES_GUESS } from '@/domains/guess/queries';
import { runGuessAnalysis } from '@/domains/guess/services/guess-analysis-v2';
import type { ScoredEndedMatchGuess } from './types';

export const scoreEndedMatchGuesses = async (matchId: string): Promise<ScoredEndedMatchGuess[]> => {
  const guessesToScore = await QUERIES_GUESS.listGuessesForEndedMatch(matchId);

  return guessesToScore.map(row => ({
    ...row,
    guessAnalysis: runGuessAnalysis(row.guess, row.match),
  }));
};
