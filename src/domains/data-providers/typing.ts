import { DB_InsertMatch } from '@/domains/match/schema';
import { DB_InsertTournament, DB_SelectTournament } from '@/domains/tournament/schema';
import { DB_InsertTeam } from '../team/schema';
import { TeamOnStandings } from '../tournament/typing';

export type IApiProvider = {
  tournament: {
    createUrl: (data: { externalId: string }) => string;
    createOnDB: (data: DB_InsertTournament) => Promise<DB_SelectTournament[]>;
    updateOnDB: (data: DB_InsertTournament) => Promise<DB_SelectTournament[]>;
    standings: {
      fetch: (url: string) => Promise<any>;
      parse: (standings: any) => {
        teams: TeamOnStandings[];
      };
    };
  };
  match: {
    insertOnDB: (matches: DB_InsertMatch[]) => void;
    updateOnDB: (matches: DB_InsertMatch[]) => void;
    parseToDB: <T>(data: {
      roundId: number;
      tournamentId: string;
      tournamentExternalId: string;
      match: T;
    }) => DB_InsertMatch;
  };
  rounds: {
    createUrl: (data: {
      externalId: string;
      mode: string;
      slug: string;
      round: number;
      season: string;
    }) => string;
    fetch: (url: string) => Promise<any[]>;
  };
  team: {
    parseToDB: (team: any) => DB_InsertTeam;
    parseToStandings: (team: any) => TeamOnStandings;
  };
};
