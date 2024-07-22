import { SelectGuess } from 'src/services/database/schema'

export const SCORE_MAPPER = {
  EXACT_SCORE: 3,
  MATCH_RESULT: 1
} as const

const hasGuessedExactScore = (guess: SelectGuess, game: any) =>
  guess.homeScore === game.homeScore && guess.awayScore === game.awayScore

const hasGuessedMatchResult = (guess: SelectGuess, game: any) => {
  let guessResult = null
  let matchResult = null

  if (guess.homeScore > guess.awayScore) {
    guessResult = 'HOME_WIN'
  } else if (guess.homeScore < guess.awayScore) {
    guessResult = 'AWAY_WIN'
  } else {
    guessResult = 'DRAW'
  }

  if (game?.homeScore > game?.awayScore) {
    matchResult = 'HOME_WIN'
  } else if (game?.homeScore < game?.awayScore) {
    matchResult = 'AWAY_WIN'
  } else {
    matchResult = 'DRAW'
  }

  return guessResult === matchResult
}

export const analyzeScore = (guess: any, game: any) => {
  if (!guess) return 0

  const guessedExactScore = hasGuessedExactScore(guess, game)
  const guessedMatchResult = hasGuessedMatchResult(guess, game)

  return {
    EXACT_SCORE: guessedExactScore ? SCORE_MAPPER.EXACT_SCORE : 0,
    MATCH_RESULT: guessedMatchResult ? SCORE_MAPPER.MATCH_RESULT : 0
  } satisfies Record<keyof typeof SCORE_MAPPER, number>
}
