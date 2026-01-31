import { DB_InsertMatch } from '@/domains/match/schema';
import { DB_InsertTeam } from '@/domains/team/schema';
import { DB_InsertTournamentRound, DB_SelectTournamentRound } from '@/domains/tournament-round/schema';
import { TournamentQuery } from '@/domains/tournament/queries';
import { DB_InsertTournament, DB_InsertTournamentStandings, DB_SelectTournament } from '@/domains/tournament/schema';
import { FetchAndStoreAssetPayload } from '@/utils';
import { Request } from 'express';

export type IApiProvider = {
  tournament: {
    fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
    createOnDatabase: (data: any & { logo: string }) => Promise<DB_SelectTournament>;
    updateOnDatabase: (data: DB_InsertTournament) => Promise<DB_SelectTournament>;
  };
  rounds: {
    fetchRoundFromProvider: (providerUrl: string) => Promise<API_SOFASCORE_ROUND>;
    fetchShallowListOfRoundsFromProvider: (baseUrl: string) => Promise<API_SOFASCORE_ROUNDS>;
    mapShallowListOfRounds: (data: API_SOFASCORE_ROUNDS, tournament: NonNullable<TournamentQuery>) => Promise<any[]>;
    createOnDatabase: (rounds: DB_InsertTournamentRound[]) => Promise<DB_SelectTournamentRound[]>;
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
    mapTeamsFromRound: (round: API_SOFASCORE_ROUND, provider: string) => Promise<DB_InsertTeam[]>;
    createOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[]>;
    upsertOnDatabase: (teams: DB_InsertTeam[]) => Promise<any>;
  };
  standings: {
    fetchStandingsFromProvider: (baseUrl: string) => Promise<API_SOFASCORE_STANDINGS | null>;
    mapStandings: (data: any, tournamentId: string, tournamentStandingsMode: string) => Promise<any>;
    createOnDatabase: (standings: any) => Promise<DB_InsertTournamentStandings[]>;
    upsertOnDatabase: (standings: any) => Promise<any>;
  };
};

export interface IDataProviderTournamentRound {
  fetchRoundFromProvider: (providerUrl: string) => Promise<API_SOFASCORE_ROUND>;
  fetchRoundsFromProvider: (providerUrl: string) => Promise<API_SOFASCORE_ROUNDS>;
  createRoundsOnDatabase: (data: API_SOFASCORE_ROUNDS, tournamentId: string) => Promise<any>;
}

export interface IDataProviderMatch {
  round: API_SOFASCORE_ROUND;
}

export interface IDataProviderMatchUpdate {
  round: API_SOFASCORE_ROUND;
  tournamentId: string;
}

export interface IDataProviderStandings {
  fetchStandingsFromProvider: (providerUrl: string) => Promise<API_SOFASCORE_STANDINGS | null>;
}

export enum DataProviderExecutionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DataProviderExecutionOperationType {
  TOURNAMENT_CREATE = 'tournament_create',
  TOURNAMENT_UPDATE = 'tournament_update',
  STANDINGS_CREATE = 'standings_create',
  STANDINGS_UPDATE = 'standings_update',
  TEAMS_CREATE = 'teams_create',
  TEAMS_UPDATE = 'teams_update',
  ROUNDS_CREATE = 'rounds_create',
  ROUNDS_UPDATE = 'rounds_update',
  MATCHES_CREATE = 'matches_create',
  MATCHES_UPDATE = 'matches_update',
}

export type CreateTournamentInput = {
  tournamentPublicId: string;
  baseUrl: string;
  slug: string;
  provider: string;
  season: string;
  mode: 'regular-season-only' | 'regular-season-and-knockout' | 'knockout-only';
  label: string;
  standingsMode: 'unique-group' | 'multi-group';
};

export type TournamentRequestIn = Request<{ tournamentId?: string }, CreateTournamentInput>;

export type UpdateTournamentInput = CreateTournamentInput;

export interface API_SOFASCORE_STANDINGS {
  standings: {
    tournament: {
      name: string;
      slug: string;
      category: {
        name: string;
        slug: string;
        sport: {
          name: string;
          slug: string;
          id: number;
        };
        id: number;
        flag: string;
        alpha2: string;
      };
      uniqueTournament: {
        name: string;
        slug: string;
        primaryColorHex: string;
        secondaryColorHex: string;
        category: {
          name: string;
          slug: string;
          sport: {
            name: string;
            slug: string;
            id: number;
          };
          id: number;
          flag: string;
          alpha2: string;
        };
        userCount: number;
        hasPerformanceGraphFeature: boolean;
        id: number;
        displayInverseHomeAwayTeams: boolean;
      };
      priority: number;
      isGroup: boolean;
      isLive: boolean;
      id: number;
    };
    type: string;
    name: string;
    descriptions: never[];
    tieBreakingRule: {
      text: string;
      id: number;
    };
    rows: API_SOFASCORE_STANDING_TEAM[];
    id: number;
    updatedAtTimestamp: number;
  }[];
}

export interface API_SOFASCORE_STANDING_TEAM {
  team: {
    name: string;
    slug: string;
    shortName: string;
    gender: string;
    sport: {
      name: string;
      slug: string;
      id: number;
    };
    userCount: number;
    nameCode: string;
    disabled: boolean;
    national: boolean;
    type: number;
    id: number;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
    fieldTranslations: {
      nameTranslation: {
        ru: string;
      };
      shortNameTranslation: Record<string, never>;
    };
  };
  descriptions: [];
  promotion: {
    text: string;
    id: number;
  };
  position: number;
  matches: number;
  wins: number;
  scoresFor: number;
  scoresAgainst: number;
  id: number;
  losses: number;
  draws: number;
  points: number;
  scoreDiffFormatted: string;
}

export interface API_SOFASCORE_ROUND {
  events: API_SOFASCORE_MATCH[];
  hasPreviousPage: boolean;
}

export interface API_SOFASCORE_ROUNDS {
  currentRound: {
    round: number;
    name: string;
    slug: string;
  };
  rounds: {
    round: number;
    name: string;
    slug: string;
  }[];
}

export interface API_SOFASCORE_MATCH {
  id: number;
  slug: string;
  roundInfo: {
    round: number;
  };
  startTimestamp: number | null;
  tournament: {
    uniqueTournament: {
      id: number;
    };
  };
  status: {
    description: string;
    type: string;
    code: number;
  };
  winnerCode: number | null;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    slug: string;
    nameCode: string;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    slug: string;
    nameCode: string;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  homeScore: {
    current: number;
    display: number;
    period1: number;
    period2: number;
    normaltime: number;
    penalties: number;
  };
  awayScore: {
    current: number;
    display: number;
    period1: number;
    period2: number;
    normaltime: number;
    penalties: number;
  };
}

export const DATA_PROVIDER_EXECUTION_STATUS = {
  STARTED: 'started',
  FAILED: 'failed',
  COMPLETED: 'completed',
} as const;

export type IDataProviderExecutionStatus =
  (typeof DATA_PROVIDER_EXECUTION_STATUS)[keyof typeof DATA_PROVIDER_EXECUTION_STATUS];
