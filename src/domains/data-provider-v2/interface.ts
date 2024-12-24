import { FetchAndStoreAssetPayload } from '@/utils';
import { type Request } from 'express';
import { DB_InsertMatch } from '../match/schema';
import { DB_InsertTeam } from '../team/schema';
import {
  DB_InsertTournament,
  DB_InsertTournamentRound,
  DB_InsertTournamentStandings,
  DB_SelectTournament,
  DB_SelectTournamentRound,
  DB_UpdateTournamentRound,
} from '../tournament/schema';
import { API_SofaScoreRounds } from './providers/sofascore/typing';

export type IApiProviderV2 = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (
      data: PayloadTournament & { logo: string }
    ) => Promise<DB_SelectTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_SelectTournament>;
    fetchRounds: (baseUrl: string) => Promise<API_SofaScoreRounds>;
    mapRoundsToInsert: (
      data: API_SofaScoreRounds,
      tournamentId: string
    ) => DB_InsertTournamentRound[] | DB_UpdateTournamentRound[];
  };
  standings: {
    fetchStandings: (baseUrl: string) => Promise<any>;
    mapStandings: (
      standings: any,
      tournamentId: string
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
  rounds: {
    fetchAvailableRounds: (
      // rounds: DB_SelectTournamentRound[],
      baseUrl: string
    ) => Promise<API_SofaScoreRounds>;
    mapAvailableRounds: (
      data: API_SofaScoreRounds,
      tournamentId: string
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

export type TeamsRequestTeamsRequest = Request<{ tournamentId: string }, null, null>;

export type MatchesRequest = Request<{ tournamentId: string; round: number }, null, null>;

export type StandingsRequest = Request<{ tournamentId: string }, null, StandingsPayload>;
export type StandingsPayload = {
  standingsUrl: string;
};
