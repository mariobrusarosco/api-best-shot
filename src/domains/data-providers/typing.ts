import { InsertMatch } from '@/domains/match/schema';
import { InsertTournament, SelectTournament } from '@/domains/tournament/schema';

export type IApiProvider = {
  tournament: {
    prepareUrl: (data: { externalId: string }) => string;
    createOnDB: (data: InsertTournament) => Promise<SelectTournament[]>;
    updateOnDB: (data: InsertTournament) => Promise<SelectTournament[]>;
    standings: {
      fetch: (url: string) => Promise<any>;
      parse: (standings: any) => any;
    };
  };
  team: {
    parse: (team: any) => any;
  };
  match: {
    insertMatchesOnDB: (matches: InsertMatch[]) => void;
    updateMatchesOnDB: (matches: InsertMatch[]) => void;
    parse: <T>(data: {
      roundId: number;
      tournamentId: string;
      tournamentExternalId: string;
      match: T;
    }) => InsertMatch;
  };
  rounds: {
    prepareUrl: (data: {
      externalId: string;
      mode: string;
      slug: string;
      round: number;
      season: string;
    }) => string;
    fetchRound: (url: string) => Promise<any[]>;
  };
};

export type TournamentRoundFromApi = {
  matches: any[];
  roundId: number;
  tournamentId: string | number;
};

export interface TournamentStanding {
  teams: {
    externalId: string;
    position: number;
    matches: number;
    wins: number;
    points: number;
  }[];
}
