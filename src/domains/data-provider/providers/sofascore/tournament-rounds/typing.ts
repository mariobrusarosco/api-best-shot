// Endpoint example: https://api.sofascore.com/api/v1/unique-tournament/16/season/325/rounds

export type API_SofaScoreRounds = {
  currentRound: {
    round: number;
  };
  rounds: {
    round: number;
    name?: string;
    slug?: string;
    prefix?: string;
  }[];
};

// Endpoint example: https://api.sofascore.com/api/v1/unique-tournament/16/season/325/rounds/1

export type API_SofaScoreRound = {
  events: API_SofaScoreMatch[];
  hasPreviousPage: boolean;
};
