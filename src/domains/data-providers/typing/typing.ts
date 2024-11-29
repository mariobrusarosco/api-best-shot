export type IApiProvider = {
  getURL: (data: {
    externalId: string;
    mode: string;
    slug: string;
    round: number;
  }) => string;
  // match: {
  //   parse: <T>(tournamentRound: TournamentRound<T>) => InsertMatch;
  // };
};

export type TournamentRound<T> = {
  tournamentId: string;
  roundId: number;
  rawData: T[];
};
