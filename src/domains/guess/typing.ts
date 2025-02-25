import { Request } from 'express';

export type CreateGuessRequest = Request<{}, {}, GuessInput & { publicId: string }, {}>;

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

export type MemberGuessesRequest = Request<
  {
    tournamentId: string;
  },
  null,
  null,
  { round: string }
>;
