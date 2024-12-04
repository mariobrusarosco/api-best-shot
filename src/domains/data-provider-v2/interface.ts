import { FetchAndStoreAssetPayload } from '@/utils';
import { type Request } from 'express';
import { DB_InsertTournament } from '../tournament/schema';

export type IApiProviderV2 = {
  tournament: {
    // fetchStandings: () => void;
    // fetchRounds: () => void;
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (data: DB_InsertTournament) => Promise<DB_InsertTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_InsertTournament>;
  };
};

export type TournamentRequest = Request<null, null, PayloadTournament>;

export type PayloadTournament = {
  externalId: string;
  standingsUrl: string;
  roundsUrl: string;
  label: string;
  rounds: string;
  provider: string;
  season: string;
  mode: string;
  logoUrl?: string;
  logoPngBase64?: string;
};
