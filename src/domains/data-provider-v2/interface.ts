import { FetchAndStoreAssetPayload } from '@/utils';
import { type Request } from 'express';
import { DB_InsertMatch } from '../match/schema';
import { DB_InsertTeam } from '../team/schema';
import {
  DB_InsertTournament,
  DB_InsertTournamentRound,
  DB_SelectTournament,
  DB_SelectTournamentRound,
} from '../tournament/schema';
import { API_SofaScoreRound, API_SofaScoreRounds } from './providers/sofascore/typing';

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
  matches: {
    mapRoundMatches: (
      round: any,
      roundId: string,
      tournamentId: string
    ) => DB_InsertMatch[];
  };
  teams: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    fetchTeamsFromStandings: (tournamentId: string) => Promise<any>;
    mapTeamsFromStandings: (standings: any, provider: string) => Promise<DB_InsertTeam[]>;
    mapTeamsFromKnockoutRounds: (
      knockoutRound: API_SofaScoreRound[],
      provider: string
    ) => Promise<any>;
    fetchTeamsFromKnockoutRounds: (tournamentId: string) => Promise<API_SofaScoreRound[]>;
    createOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[]>;
    // updateOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[] | undefined>;
  };
};

export type TournamentRequest = Request<null, PayloadTournament>;

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
