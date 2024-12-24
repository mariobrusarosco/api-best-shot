import { FetchAndStoreAssetPayload } from '@/utils';
import { type Request } from 'express';
import {
  DB_InsertTournament,
  DB_InsertTournamentRound,
  DB_SelectTournament,
  DB_SelectTournamentRound,
} from '../tournament/schema';
import { API_SofaScoreRounds } from './providers/sofascore/typing';

export type IApiProviderV2 = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (
      data: PayloadTournament & { logo: string }
    ) => Promise<DB_SelectTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_SelectTournament>;
  };
  rounds: {
    fetchRoundsFromProvider: (baseUrl: string) => Promise<API_SofaScoreRounds>;
    mapAvailableRounds: (
      data: API_SofaScoreRounds,
      tournament: DB_SelectTournament
    ) => Promise<any[]>;
    createOnDatabase: (
      rounds: DB_InsertTournamentRound[]
    ) => Promise<DB_SelectTournamentRound[]>;
    updateOnDatabase: (
      rounds: DB_InsertTournamentRound[]
    ) => Promise<DB_SelectTournamentRound[] | undefined>;
  };
};

export type TournamentRequest = Request<null, null, PayloadTournament>;

export type PayloadTournament = {
  externalId: string;
  baseUrl: string;
  slug: string;
  provider: string;
  season: string;
  mode: 'regular-season-only' | 'regular-season-and-knockout' | 'knockout-only';
  label: string;
  logoUrl?: string;
  logoPngBase64?: string;
};
