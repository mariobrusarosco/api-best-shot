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
  OPEN: 'open',
  FINALIZED: 'finalized',
} as const;

export type GUESS_STATUS = (typeof GUESS_STATUSES)[keyof typeof GUESS_STATUSES];
