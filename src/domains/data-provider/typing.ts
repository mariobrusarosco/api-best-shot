import { CreateTournamentInput } from '@/domains/data-provider/api/tournament/typing';
import {
  API_SofaScoreRound,
  API_SofaScoreRounds,
} from '@/domains/data-provider/providers/sofascore/tournament-rounds/typing';
import { DB_InsertMatch } from '@/domains/match/schema';
import { DB_InsertTeam } from '@/domains/team/schema';
import { TournamentQuery } from '@/domains/tournament/queries';
import {
  DB_InsertTournament,
  DB_InsertTournamentRound,
  DB_SelectTournament,
  DB_SelectTournamentRound,
} from '@/domains/tournament/schema';
import { FetchAndStoreAssetPayload } from '@/utils';

export type IApiProvider = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (
      data: CreateTournamentInput & { logo: string }
    ) => Promise<DB_SelectTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_SelectTournament>;
  };
  rounds: {
    fetchRoundFromProvider: (providerUrl: string) => Promise<API_SofaScoreRound>;
    fetchShallowListOfRoundsFromProvider: (
      baseUrl: string
    ) => Promise<API_SofaScoreRounds>;
    mapShallowListOfRounds: (
      data: API_SofaScoreRounds,
      tournament: NonNullable<TournamentQuery>
    ) => Promise<any[]>;
    createOnDatabase: (
      rounds: DB_InsertTournamentRound[]
    ) => Promise<DB_SelectTournamentRound[]>;
    upsertOnDatabase: (rounds: DB_InsertTournamentRound[]) => Promise<any>;
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
    mapTeamsFromStandings: (standings: any, provider: string) => Promise<DB_InsertTeam[]>;
    mapTeamsFromRound: (round: API_SofaScoreRound, provider: string) => Promise<any>;
    createOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[]>;
    upsertOnDatabase: (teams: DB_InsertTeam[]) => Promise<any>;
  };
  standings: {
    fetchStandingsFromProvider: (baseUrl: string) => Promise<any>;
    mapStandings: (data: any, provider: string) => Promise<any>;
    createOnDatabase: (standings: any) => Promise<any>;
  };
};
