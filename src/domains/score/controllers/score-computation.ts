import { SelectGuess } from '../../../services/database/schema'

export const SCORE_MAPPER = {
  EXACT_SCORE: 3,
  MATCH_RESULT: 1
} as const

const hasGuessedExactScore = (guess: SelectGuess, match: any) =>
  guess.homeScore === match.homeScore && guess.awayScore === match.awayScore

const hasGuessedMatchResult = (guess: SelectGuess, match: any) => {
  let guessResult = null
  let matchResult = null

  if (guess.homeScore > guess.awayScore) {
    guessResult = 'HOME_WIN'
  } else if (guess.homeScore < guess.awayScore) {
    guessResult = 'AWAY_WIN'
  } else {
    guessResult = 'DRAW'
  }

  if (match?.homeScore > match?.awayScore) {
    matchResult = 'HOME_WIN'
  } else if (match?.homeScore < match?.awayScore) {
    matchResult = 'AWAY_WIN'
  } else {
    matchResult = 'DRAW'
  }

  return guessResult === matchResult
}

type IScore = Record<keyof typeof SCORE_MAPPER | 'TOTAL', number>

export const analyzeScore = (guess: any, match: any): IScore => {
  if (!guess) return { EXACT_SCORE: 0, MATCH_RESULT: 0, TOTAL: 0 }

  const EXACT_SCORE = hasGuessedExactScore(guess, match) ? SCORE_MAPPER.EXACT_SCORE : 0
  const MATCH_RESULT = hasGuessedMatchResult(guess, match) ? SCORE_MAPPER.MATCH_RESULT : 0

  return {
    EXACT_SCORE,
    MATCH_RESULT,
    TOTAL: EXACT_SCORE + MATCH_RESULT
  }
}
