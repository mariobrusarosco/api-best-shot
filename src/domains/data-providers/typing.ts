import { InsertTournament, SelectTournament } from '../tournament/schema';

export type IApiProvider = {
  getURL: (data: {
    externalId: string;
    mode: string;
    slug: string;
    round: number;
  }) => string;
  tournament: {
    prepareUrl: (data: { externalId: string }) => string;
    createOnDB: (data: InsertTournament) => Promise<SelectTournament[]>;
    updateOnDB: (data: InsertTournament) => Promise<SelectTournament[]>;
  };
  match: {
    prepareUrl: (data: {
      externalId: string;
      mode: string;
      slug: string;
      round: number;
      season: string;
    }) => string;
  };
  // match: {
  //   parse: <T>(tournamentRound: TournamentRound<T>) => InsertMatch;
  // };
};

export type TournamentRound<T> = {
  tournamentId: string;
  roundId: number;
  rawData: T[];
};
