import { type Request } from 'express';
import { DB_InsertTournament } from '../tournament/schema';

export type IApiProviderV2 = {
  tournament: {
    // fetchStandings: () => void;
    // fetchRounds: () => void;
    // parseToDatabaseFormat: () => void;
    createOnDatabase: (data: DB_InsertTournament) => Promise<DB_InsertTournament>;
    // update: () => void;
  };
};

export type TournamentRequest = Request<null, null, PayloadTournament>;

export type PayloadTournament = {
  externalId: string;
  standingsUrl: string;
  roundsUrl: string;
  rounds: string;
  provider: string;
  season: string;
  mode: string;
  label: string;
  logo?: string;
  logoBaseUrl?: string;
};
