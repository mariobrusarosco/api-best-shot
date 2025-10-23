import type { DB_SelectTournament } from '@/domains/tournament/schema';

export type TeamOnStandings = {
  externalId: string;
  position: number;
  matches: number;
  wins: number;
  points: number;
};

export interface TournamentStandings {
  teams: TeamOnStandings;
}

export type TournamentMode = 'regular-season-and-knockout' | 'regular-season-only' | 'knockout-only';

// Override just the standingsMode property
export type TournamentWithTypedMode = Omit<DB_SelectTournament, 'mode'> & {
  mode: TournamentMode;
};

export type ITournament = DB_SelectTournament;
