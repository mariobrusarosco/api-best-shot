import { type Request } from 'express';

export type IApiProviderV2 = {
  tournament: {
    // fetchStandings: () => void;
    // fetchRounds: () => void;
    // parseToDatabaseFormat: () => void;
    // insert: () => void;
    // update: () => void;
  };
};

export type TournamentRequest = Request<null, null, PayloadTournament>;

export type PayloadTournament = {
  roundsUrl: string;
  standingsUrl: string;
};
