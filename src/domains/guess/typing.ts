export type GuessInput = {
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
} as const;

export type GUESS_STATUS = (typeof GUESS_STATUSES)[keyof typeof GUESS_STATUSES];
