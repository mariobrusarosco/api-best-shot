import { CreateTournamentInput } from '@/domains/data-provider/api/typying/tournament';
import { TournamentQuery } from '@/domains/tournament/queries';
import { FetchAndStoreAssetPayload } from '@/utils';
import {
  API_SofaScoreRound,
  API_SofaScoreRounds,
} from '../../data-provider-v2/providers/sofascore/typing';
import { DB_InsertMatch } from '../../match/schema';
import { DB_InsertTeam } from '../../team/schema';
import {
  DB_InsertTournament,
  DB_InsertTournamentRound,
  DB_SelectTournament,
  DB_SelectTournamentRound,
} from '../../tournament/schema';

export type IApiProvider = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (
      data: CreateTournamentInput & { logo: string }
    ) => Promise<DB_SelectTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_SelectTournament>;
  };
  rounds: {
    // fetchRoundFromProvider: (providerUrl: string) => Promise<API_SofaScoreRound>;
    fetchRoundsFromProvider: (baseUrl: string) => Promise<API_SofaScoreRounds>;
    mapAvailableRounds: (
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
