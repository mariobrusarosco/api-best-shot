// Endpoint example: https://api.sofascore.com/api/v1/unique-tournament/16/season/325/rounds

import { API_SOFASCORE_MATCH } from "../matches/typing";

export interface API_SOFASCORE_ROUNDS {
  currentRound: {
    round: number;
  };
  rounds: {
    round: number;
    name?: string;
    slug?: string;
    prefix?: string;
  }[];
}

// Endpoint example: https://api.sofascore.com/api/v1/unique-tournament/16/season/325/rounds/1

export interface API_SOFASCORE_ROUND {
  events: API_SOFASCORE_MATCH[];
  hasPreviousPage: boolean;
}
