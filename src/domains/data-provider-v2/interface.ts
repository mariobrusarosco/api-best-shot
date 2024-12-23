import { DB_InsertMatch, DB_InsertTeam } from '@/services/database/schema';
import { FetchAndStoreAssetPayload } from '@/utils';
import { type Request } from 'express';
import { DB_InsertTournament, DB_InsertTournamentStandings } from '../tournament/schema';

export type IApiProviderV2 = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (data: DB_InsertTournament) => Promise<DB_InsertTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_InsertTournament>;
  };
  standings: {
    fetchStandings: (req: StandingsRequest) => Promise<{
      standings: any;
      tournamentId: string;
    }>;
    // fetchStandingsForm?: (req: StandingsRequest) => Promise<any>;
    mapStandings: (
      standings: any,
      tournamenId: string
    ) => Promise<DB_InsertTournamentStandings[]>;
    createOnDatabase: (
      standings: DB_InsertTournamentStandings[]
    ) => Promise<DB_InsertTournamentStandings[]>;
    updateOnDatabase: (
      standings: DB_InsertTournamentStandings[]
    ) => Promise<DB_InsertTournamentStandings[] | undefined>;
  };
  teams: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    fetchTeamsFromStandings: (tournamentId: string) => Promise<any>;
    mapTeamsFromStandings: (standings: any, provider: string) => Promise<DB_InsertTeam[]>;
    createOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[]>;
    updateOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[] | undefined>;
  };
  matches: {
    fetchRound: (url: string, round: number) => Promise<any>;
    mapRound: (round: any, roundId: string, tournamentId: string) => DB_InsertMatch[];
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
  slug: string;
  logoUrl?: string;
  logoPngBase64?: string;
};

export type TeamsRequest = Request<{ tournamentId: string }, null, null>;

export type MatchesRequest = Request<{ tournamentId: string; round: number }, null, null>;

export type StandingsRequest = Request<{ tournamentId: string }, null, StandingsPayload>;
export type StandingsPayload = {
  standingsUrl: string;
};
