import { CreateTournamentInput } from '@/domains/data-provider/api/v1/tournament/typing';
import {
  API_SOFASCORE_ROUND,
  API_SOFASCORE_ROUNDS,
} from './providers/sofascore/tournament-rounds/typing';
import { DB_InsertMatch } from '@/domains/match/schema';
import { DB_InsertTeam } from '@/domains/team/schema';
import { TournamentQuery } from '@/domains/tournament/queries';
import {
  DB_InsertTournament,
  DB_InsertTournamentRound,
  DB_InsertTournamentStandings,
  DB_SelectTournament,
  DB_SelectTournamentRound,
} from '@/domains/tournament/schema';
import { FetchAndStoreAssetPayload } from '@/utils';
import { API_SOFASCORE_STANDINGS } from './providers/sofascore/standings/typing';

export type IApiProvider = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (
      data: CreateTournamentInput & { logo: string }
    ) => Promise<DB_SelectTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_SelectTournament>;
  };
  rounds: {
    fetchRoundFromProvider: (providerUrl: string) => Promise<API_SOFASCORE_ROUND>;
    fetchShallowListOfRoundsFromProvider: (
      baseUrl: string
    ) => Promise<API_SOFASCORE_ROUNDS>;
    mapShallowListOfRounds: (
      data: API_SOFASCORE_ROUNDS,
      tournament: NonNullable<TournamentQuery>
    ) => Promise<any[]>;
    createOnDatabase: (
      rounds: DB_InsertTournamentRound[]
    ) => Promise<DB_SelectTournamentRound[]>;
    upsertOnDatabase: (rounds: DB_InsertTournamentRound[]) => Promise<any>;
  };
  matches: {
    mapRoundMatches: (data: {
      round: API_SOFASCORE_ROUND;
      roundSlug: string;
      tournamentId: string;
    }) => DB_InsertMatch[];
    upsertOnDatabase: (matches: DB_InsertMatch[]) => Promise<any>;
    createOnDatabase: (matches: DB_InsertMatch[]) => Promise<any>;
  };
  teams: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    mapTeamsFromStandings: (standings: any, provider: string) => Promise<DB_InsertTeam[]>;
    mapTeamsFromRound: (
      round: API_SOFASCORE_ROUND,
      provider: string
    ) => Promise<DB_InsertTeam[]>;
    createOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[]>;
    upsertOnDatabase: (teams: DB_InsertTeam[]) => Promise<any>;
  };
  standings: {
    fetchStandingsFromProvider: (
      baseUrl: string
    ) => Promise<API_SOFASCORE_STANDINGS | null>;
    mapStandings: (
      data: any,
      tournamentId: string,
      tournamentStandingsMode: string
    ) => Promise<any>;
    createOnDatabase: (standings: any) => Promise<DB_InsertTournamentStandings[]>;
    upsertOnDatabase: (standings: any) => Promise<any>;
  };
};

export interface IDataProviderTournamentRound {
  fetchRoundFromProvider: (providerUrl: string) => Promise<API_SOFASCORE_ROUND>;
  fetchRoundsFromProvider: (
    providerUrl: string
  ) => Promise<API_SOFASCORE_ROUNDS>;
  createRoundsOnDatabase: (
    data: API_SOFASCORE_ROUNDS,
    tournamentId: string
  ) => Promise<any>;
}

export interface IDataProviderMatch {
  round: API_SOFASCORE_ROUND;
}

export interface IDataProviderMatchUpdate {
  round: API_SOFASCORE_ROUND,
  tournamentId: string
}

export interface IDataProviderStandings {
  fetchStandingsFromProvider: (
    providerUrl: string
  ) => Promise<API_SOFASCORE_STANDINGS | null>;
}
