import { DB_InsertTeam } from '@/services/database/schema';
import { FetchAndStoreAssetPayload } from '@/utils';
import { type Request } from 'express';
import { DB_InsertTournament } from '../tournament/schema';

export type IApiProviderV2 = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (data: DB_InsertTournament) => Promise<DB_InsertTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_InsertTournament>;
  };
  teams: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    fetchTeamsFromStandings: (req: TeamsRequest) => Promise<any>;
    mapTeamsFromStandings: (standings: any) => Promise<DB_InsertTeam[]>;
    createOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[]>;
    updateOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[] | undefined>;
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

export type TeamsRequest = Request<null, null, TeamsPayload>;
export type TeamsPayload = {
  standingsUrl: string;
};
