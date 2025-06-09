import { Request } from 'express';

export type CreateGuessRequest = Request<
  Record<string, never>,
  Record<string, never>,
  GuessInput & { publicId: string },
  Record<string, never>
>;

export type GuessInput = {
  id: string;
  matchId: string;
  home: {
    score: number;
  };
  away: {
    score: number;
  };
};

export const GUESS_STATUSES = {
  EXPIRED: 'expired',
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  NOT_STARTED: 'not-started',
  WAITING_FOR_GAME: 'waiting_for_game',
  FINALIZED: 'finalized',
  PAUSED: 'paused',
} as const;

export type GUESS_STATUS = (typeof GUESS_STATUSES)[keyof typeof GUESS_STATUSES];

export interface GuessAnalysis {
  status: string;
  fullMatch: {
    status: 'correct' | 'incorrect';
  };
}

export interface GuessesByOutcome {
  correct: number;
  incorrect: number;
}

export interface GuessesByStatus {
  [key: string]: number;
}

export type MemberGuessesRequest = Request<
  {
    tournamentId: string;
  },
  null,
  null,
  { round: string }
>;
