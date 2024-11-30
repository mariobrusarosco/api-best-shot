import { InsertMatch } from '@/domains/match/schema';
import { InsertTournament, SelectTournament } from '@/domains/tournament/schema';

export type IApiProvider = {
  tournament: {
    prepareUrl: (data: { externalId: string }) => string;
    createOnDB: (data: InsertTournament) => Promise<SelectTournament[]>;
    updateOnDB: (data: InsertTournament) => Promise<SelectTournament[]>;
    fetchStandings: (url: string) => Promise<any>;
    parseStandings: (standings: any) => MappedStandings;
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

interface MappedStandings {}
